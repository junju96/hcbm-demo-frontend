# Zenoh 执行/暂停控制接口用法总结

> 整理日期：2026-09-01
> 范围：后端经 Zenoh 向无人车下发 MissionService 指令（重点是 control_mission 开始/暂停/继续/停止）与接收车辆反馈的用法
> 事实来源：`backend-dev/app/services/action_sequence_client.py`、`backend-dev/app/services/zenoh_client.py`、`backend-dev/app/routers/zenoh.py`、`backend-dev/zenoh_py/zenoh.json5`

## 1. Zenoh 在本项目中的角色

```
后端 (28600)
  │  publish：send_mission（下发任务）/ control_mission（开始/暂停/继续/停止）
  ▼
Zenoh Router: tcp/25.11.1.147:7447
  ▼
无人车（topic: op/t01/g01/v{vid}/...）
  │  publish：反馈 topic（ack / task_received_status / mission_status / chassis_resource）
  ▼
后端订阅缓存（每 topic 200 条环形缓冲）
```

- 连接配置：`zenoh_py/zenoh.json5` → router 模式 `tcp/25.11.1.147:7447`
- 连不上 router 时自动回退 **local-peer 模式**（`zenoh_service.json` 的 `local_peer_fallback: true`），日志会标注 `LOCAL-PEER FALLBACK MODE`——本地回退模式下消息到不了真实车辆，联调时注意分辨
- 相关环境变量：`ZENOH_LOG_FILE`（默认 `/tmp/zenoh_payload.log`）、`ZENOH_CONFIG_PATH`、`ZENOH_SERVICE_CONFIG_PATH`、`ZENOH_ONLY_LOG=1`

## 2. control_mission：执行/暂停/继续/停止（重点）

### 2.1 Topic

```
op/t01/g01/v{vid}/cmd/MissionService/control_mission
```

- `vid` 为去掉 `equipment:` 前缀的车辆编号（如 `equipment:ZD03` → `ZD03`）
- 单车控制：vid 用接口入参 `vehicle_vid`；未指定时取 plan 的第一辆车（`get_first_vid`，兼容 `vehicle_summary` / `stages.team_actions` 两种结构，兜底 `ZD01`）

### 2.2 Payload

```json
{
  "service": "MissionService",
  "action": "control_mission",
  "args": {
    "taskid": 10001,
    "aid": 0,
    "task_control": 2,
    "action_control": 0
  }
}
```

| 字段 | 说明 |
|---|---|
| `taskid` | 由 plan_id 生成：取 plan_id2 中全部数字拼接（截前 10 位），无数字则 md5 前 8 位转 int 兜底（`_plan_id_to_tid`，action_sequence_client.py:2253） |
| `aid` | 固定 0（当前未做行动级控制） |
| `task_control` | **1=开始，2=暂停，3=继续，4=停止** |
| `action_control` | 固定 0 |

### 2.3 后端封装用法

```python
from app.services.action_sequence_client import publish_control_mission

ok, message = publish_control_mission(
    plan_id="plan-1020",
    task_control=2,              # 1开始 2暂停 3继续 4停止
    vehicle_vid="ZD03",          # 可选；不传则取 plan 首车
)
# 返回 (bool, str)；失败时 message 含 Zenoh 错误详情
```

- 构建：`build_control_mission_payload(plan_id, task_control, vehicle_vid)` → `(topic, payload)`（:2298-2331）
- 发布：`publish_control_mission` → `zenoh_client.publish(topic, payload)`（:2334-2361）
- **注意：`publish` 返回 False 只代表 Zenoh 层发送失败，不代表车端拒绝；车端是否执行要靠反馈 topic 确认（见第 4 节）**

### 2.4 调用点（HTTP 入口）

| 操控席端点 | task_control | 状态机动作 |
|---|---|---|
| `POST /api/v1/action-sequences/operator/plans/{id}/start?vehicle_vid=` | 1 | `transit → ACTIVE` + 启动任务监控轮询 |
| `.../pause?vehicle_vid=` | 2 | `transit → PAUSED`（不停轮询） |
| `.../resume?vehicle_vid=` | 3 | `transit → ACTIVE` |
| `.../stop?vehicle_vid=` | 4 | `reset → SCHEDULED` + 停止监控轮询 |

协同席同名端点（无 operator 前缀、无 vid 参数）逻辑相同，只是 vid 取 plan 首车且无任务监控联动。

## 3. 与 send_mission 的区别

| | send_mission | control_mission |
|---|---|---|
| 用途 | 下发完整任务（行动方案）到车 | 对已下发任务做运行控制 |
| topic | `op/t01/g01/v{vid}/cmd/MissionService/send_mission` | `.../cmd/MissionService/control_mission` |
| payload | `{service, action: "send_mission", args: {mission_data: {...}}}`（`build_mission_payload`，:2227） | `{service, action: "control_mission", args: {taskid, aid: 0, task_control, action_control: 0}}` |
| 入口 | `POST .../operator/plans/{id}/dispatch` | start/pause/resume/stop |
| 顺序 | 先 dispatch 下发，后 start 启动 | 控制已下发的任务 |

## 4. 车辆反馈订阅

选中车辆时（`POST /api/v1/action-sequences/select-vehicle`）自动订阅 4 个反馈 topic（`subscribe_vehicle_feedbacks`，zenoh_client.py:220-244）：

| Topic | 内容 |
|---|---|
| `mgmt/t01/g01/v{vid}/cmd/ack` | 指令应答 |
| `op/t01/g01/v{vid}/mission/task_received_status` | 任务接收状态 |
| `op/t01/g01/v{vid}/mission/mission_status` | 任务执行状态 |
| `op/t01/g01/v{vid}/resource/chassis_resource` | 底盘资源状态 |

- 反馈消息缓存在内存环形缓冲（每 topic 200 条），`_on_feedback_message` 统一打印 IN 日志 + 缓存
- 自定义订阅可用 `zenoh_client.subscribe(topic, on_message=cb)`，支持 `*` / `**` 通配符匹配（`_topic_matches`）

## 5. 调试 / 运维 REST 接口（/api/v1/zenoh/*）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/v1/zenoh/health` | 会话健康：`{"initialized": bool, "error": ...}` |
| GET | `/api/v1/zenoh/subscriptions` | 当前已订阅主题列表 |
| POST | `/api/v1/zenoh/publish` | 手动发布：`{"topic": "...", "payload": {...}}` |
| GET | `/api/v1/zenoh/messages/{topic}` | 拉取订阅缓存中某主题最近消息（limit 默认 50） |
| POST | `/api/v1/zenoh/subscribe-feedback/{vehicle_id}` | 手动订阅某车反馈 topic |
| GET | `/api/v1/zenoh/feedback?topic_pattern=**&limit=50` | 按通配符查缓存的车辆反馈 |
| GET | `/api/v1/zenoh/feedback/topics` | 列出已有缓存的反馈 topic |

手动发一条"暂停"的 curl 示例：

```bash
curl -X POST http://localhost:28600/api/v1/zenoh/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "op/t01/g01/vZD03/cmd/MissionService/control_mission",
    "payload": {
      "service": "MissionService",
      "action": "control_mission",
      "args": {"taskid": 1020, "aid": 0, "task_control": 2, "action_control": 0}
    }
  }'
```

## 6. 日志排查

- Zenoh 出入站日志独立写入 `/tmp/zenoh_payload.log`（`ZENOH_LOG_FILE` 可改），同时打到 stdout
- 级别：`OUT`（发布）、`IN`（反馈）、`INFO`/`ERROR`（生命周期与错误）
- 快速排查：`grep -E "ZENOH-CTRL|OUT.*control_mission|IN.*mission_status" /tmp/zenoh_payload.log`

## 7. 注意事项

1. **Zenoh 发布失败不改变 HTTP 状态码**：start/pause/resume/stop 接口 HTTP 恒 200，Zenoh 成败在响应 `data.zenoh.ok`
2. **local-peer 回退模式**下发布"成功"但消息只在本机回路，到不了真实车辆——联调先看启动日志是 ROUTER 还是 LOCAL-PEER
3. `taskid` 与 plan_id 的映射是约定式的（数字提取/md5），车端按 taskid 关联任务，改动 plan_id 命名规则时注意
4. `aid`/`action_control` 固定 0，当前只做任务级控制；行动级控制协议未定
