<template>
  <div class="apd-overlay" @click.self="onClose">
    <div class="apd-dialog">
      <div class="apd-header">
        <div class="apd-title">{{ action?.name || '行动参数' }}</div>
        <div class="apd-subtitle">{{ actionTypeLabel }} · {{ vehicleName }}</div>
        <button class="apd-close" type="button" @click="onClose">×</button>
      </div>

      <div class="apd-body">
        <!-- 1. 自主机动 / 循迹机动 -->
        <template v-if="normalizedActionType === 'auto-move'">
          <div class="apd-section">
            <div class="apd-section-title">路线参数</div>
            <label class="apd-field">
              <span>路线选择</span>
              <select v-model="editedParam.route_id" @change="onRouteChange">
                <option value="">-- 请选择路线 --</option>
                <option v-for="route in routeList" :key="route.resource_id" :value="route.resource_id">
                  {{ route.title || route.resource_id }}
                </option>
              </select>
            </label>
            <div class="apd-section-title sub">路径点列表</div>
            <div class="apd-route-table-head">
              <span>经度</span>
              <span>纬度</span>
              <span>高度</span>
              <span>半径</span>
              <span>类型</span>
            </div>
            <div v-for="(pt, idx) in editedParam.points" :key="idx" class="apd-route-table-row">
              <input v-model.number="pt.lon" type="number" step="0.000001" placeholder="经度" />
              <input v-model.number="pt.lat" type="number" step="0.000001" placeholder="纬度" />
              <input v-model.number="pt.alt" type="number" step="0.1" placeholder="高度" />
              <input v-model.number="pt.radius" type="number" placeholder="半径" />
              <select v-model.number="pt.type">
                <option :value="1">路网必经点</option>
                <option :value="2">非路网必经点</option>
                <option :value="3">禁行点</option>
              </select>
              <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removePoint('points', idx)">删</button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addPoint('points')">+ 添加路径点</button>
          </div>

          <div class="apd-section">
            <div class="apd-section-title">车辆参数</div>
            <label class="apd-field">
              <span>限速 (km/h)</span>
              <input v-model.number="editedParam.limited_speed" type="number" min="0" max="80" />
            </label>
            <label class="apd-field">
              <span>模式</span>
              <div class="apd-radio-row">
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="0" /><span>避障</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="1" /><span>突击</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="2" /><span>停障</span></label>
              </div>
            </label>
            <label class="apd-field">
              <span>绕圈模式 (-1 一直绕圈；0 不绕圈)</span>
              <input v-model.number="editedParam.loop_mode" type="number" min="-1" max="99" />
            </label>
          </div>
        </template>

        <!-- 2. 跟随机动 -->
        <template v-else-if="normalizedActionType === 'follow-move'">
          <div class="apd-section">
            <div class="apd-section-title">跟随参数</div>
            <label class="apd-field compact"><span>目标 X</span><input v-model.number="editedParam.x" type="number" /></label>
            <label class="apd-field compact"><span>目标 Y</span><input v-model.number="editedParam.y" type="number" /></label>
            <label class="apd-field compact"><span>画面宽</span><input v-model.number="editedParam.width" type="number" /></label>
            <label class="apd-field compact"><span>画面高</span><input v-model.number="editedParam.height" type="number" /></label>
            <label class="apd-field compact"><span>安全距离 (m)</span><input v-model.number="editedParam.distance" type="number" /></label>
            <label class="apd-field compact"><span>限速 (km/h)</span><input v-model.number="editedParam.limited_speed" type="number" /></label>
            <label class="apd-field">
              <span>模式</span>
              <div class="apd-radio-row">
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="0" /><span>避障</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="1" /><span>突击</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="2" /><span>停障</span></label>
              </div>
            </label>
            <label class="apd-field">
              <span>跟随策略</span>
              <div class="apd-radio-row">
                <label class="apd-radio"><input v-model.number="editedParam.strategy" type="radio" :value="0" /><span>定位跟随</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.strategy" type="radio" :value="1" /><span>非定位跟随</span></label>
              </div>
            </label>
          </div>
        </template>

        <!-- 3. 静默值守 -->
        <template v-else-if="normalizedActionType === 'silent-guard'">
          <div class="apd-section">
            <div class="apd-section-title">值守参数</div>
            <label class="apd-field"><span>值守时间 (s)</span><input v-model.number="editedParam.time" type="number" min="0" /></label>
          </div>
        </template>

        <!-- 4/5. 设置返航点 / 开启返航 -->
        <template v-else-if="['set-return-point', 'return-to-base'].includes(normalizedActionType)">
          <div class="apd-section">
            <div class="apd-empty">该行动无额外参数</div>
          </div>
        </template>

        <!-- 6. 编队机动 -->
        <template v-else-if="normalizedActionType === 'formation-move'">
          <div class="apd-section">
            <div class="apd-section-title">编队路径点</div>
            <div class="apd-route-table-head">
              <span>经度</span>
              <span>纬度</span>
              <span>高度</span>
              <span>横向偏移</span>
              <span>纵向偏移</span>
            </div>
            <div v-for="(pt, idx) in editedParam.points" :key="idx" class="apd-route-table-row">
              <input v-model.number="pt.lon" type="number" step="0.000001" />
              <input v-model.number="pt.lat" type="number" step="0.000001" />
              <input v-model.number="pt.alt" type="number" step="0.1" />
              <input v-model.number="pt.offsetX" type="number" />
              <input v-model.number="pt.offsetY" type="number" />
              <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removePoint('points', idx)">删</button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addPoint('points')">+ 添加路径点</button>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">编队参数</div>
            <label class="apd-field compact"><span>限速 (km/h)</span><input v-model.number="editedParam.limited_speed" type="number" /></label>
            <label class="apd-field">
              <span>编队模式</span>
              <select v-model.number="editedParam.formation_mode">
                <option :value="0">跟头车模式</option>
                <option :value="1">引导路径模式</option>
                <option :value="2">队形变换</option>
              </select>
            </label>
            <label class="apd-field">
              <span>模式</span>
              <div class="apd-radio-row">
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="0" /><span>避障</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="1" /><span>突击</span></label>
                <label class="apd-radio"><input v-model.number="editedParam.safe_mode" type="radio" :value="2" /><span>停障</span></label>
              </div>
            </label>
          </div>
        </template>

        <!-- 7. 人工任务 -->
        <template v-else-if="normalizedActionType === 'manual-task'">
          <div class="apd-section">
            <div class="apd-section-title">人工任务类型</div>
            <label class="apd-field">
              <span>类型</span>
              <select v-model.number="editedParam.type">
                <option :value="1">人工保障</option>
                <option :value="2">人工打击</option>
                <option :value="3">飞无人机</option>
              </select>
            </label>
          </div>
        </template>

        <!-- 8. 姿态调整 -->
        <template v-else-if="normalizedActionType === 'pose-adjust'">
          <div class="apd-section">
            <div class="apd-section-title">姿态参数</div>
            <label class="apd-field compact"><span>航向 (×100)</span><input v-model.number="editedParam.pose[0]" type="number" /></label>
            <label class="apd-field compact"><span>俯仰 (×100)</span><input v-model.number="editedParam.pose[1]" type="number" /></label>
            <label class="apd-field compact"><span>倾斜 (×100)</span><input v-model.number="editedParam.pose[2]" type="number" /></label>
            <label class="apd-field compact"><span>限速 (km/h)</span><input v-model.number="editedParam.limited_speed" type="number" /></label>
          </div>
        </template>

        <!-- 9. 光电侦察（火力/侦打/巡逻） -->
        <template v-else-if="normalizedActionType === 'lens-recon'">
          <div class="apd-section">
            <div class="apd-section-title">侦察参数</div>
            <label class="apd-field">
              <span>侦察类型</span>
              <select v-model.number="editedParam.type">
                <option :value="1">只识别</option>
                <option :value="2">识别测距</option>
                <option :value="3">识别锁定</option>
              </select>
            </label>
            <label class="apd-field">
              <span>探测模式</span>
              <select v-model.number="editedParam.mode">
                <option :value="1">单点探测</option>
                <option :value="2">线探测</option>
                <option :value="3">四点区域探测</option>
                <option :value="4">定向探测</option>
              </select>
            </label>
            <label class="apd-field"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">区域选择</div>
            <label class="apd-field">
              <span>区域</span>
              <select v-model="editedParam.area_id" @change="onAreaChange">
                <option value="">-- 请选择区域 --</option>
                <option v-for="area in areaList" :key="area.resource_id" :value="area.resource_id">
                  {{ area.title || area.resource_id }}
                </option>
              </select>
            </label>
            <div class="apd-section-title sub">区域点列表</div>
            <div class="apd-route-table-head">
              <span>经度</span>
              <span>纬度</span>
              <span>高度</span>
            </div>
            <div v-for="(pt, idx) in editedParam.area" :key="idx" class="apd-route-table-row">
              <input v-model.number="pt.lon" type="number" step="0.000001" />
              <input v-model.number="pt.lat" type="number" step="0.000001" />
              <input v-model.number="pt.alt" type="number" step="0.1" />
              <button class="as-btn mini danger" type="button" :disabled="editedParam.area.length <= 1" @click="removePoint('area', idx)">删</button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addPoint('area')">+ 添加区域点</button>
          </div>
          <div v-if="editedParam.mode === 4" class="apd-section">
            <div class="apd-section-title">定向探测参数</div>
            <label class="apd-field compact"><span>坐标系</span>
              <select v-model.number="editedParam.direct.type">
                <option :value="1">北天东</option>
                <option :value="2">车体坐标系</option>
              </select>
            </label>
            <label class="apd-field compact"><span>中心线角度 (×100)</span><input v-model.number="editedParam.direct.cent" type="number" /></label>
            <label class="apd-field compact"><span>搜索范围 (×100)</span><input v-model.number="editedParam.direct.sear" type="number" /></label>
            <label class="apd-field compact"><span>俯仰上边界 (×100)</span><input v-model.number="editedParam.direct.up" type="number" /></label>
            <label class="apd-field compact"><span>俯仰下边界 (×100)</span><input v-model.number="editedParam.direct.down" type="number" /></label>
            <label class="apd-field compact"><span>参考距离 (m)</span><input v-model.number="editedParam.direct.dist" type="number" /></label>
            <label class="apd-field compact"><span>传感器</span>
              <select v-model.number="editedParam.direct.sens">
                <option :value="0">自适应</option>
                <option :value="1">白光</option>
                <option :value="2">红外</option>
              </select>
            </label>
          </div>
        </template>

        <!-- 10. 侦察打击 -->
        <template v-else-if="normalizedActionType === 'recon-strike'">
          <template v-if="isPatrolVehicle">
            <div class="apd-section">
              <div class="apd-section-title">打击参数</div>
              <label class="apd-field compact"><span>目标类型</span><input v-model.number="editedParam.tarty" type="number" /></label>
              <label class="apd-field compact"><span>运动属性</span>
                <select v-model.number="editedParam.attr">
                  <option :value="0">未定义</option>
                  <option :value="1">静止</option>
                  <option :value="2">运动</option>
                </select>
              </label>
              <label class="apd-field compact"><span>威胁度</span><input v-model.number="editedParam.thr" type="number" min="0" max="100" /></label>
              <label class="apd-field compact"><span>毁伤要求</span>
                <select v-model.number="editedParam.dam">
                  <option :value="0">未定义</option>
                  <option :value="1">饱和攻击</option>
                  <option :value="2">不饱和攻击</option>
                </select>
              </label>
              <label class="apd-field compact"><span>遮蔽顶</span>
                <select v-model.number="editedParam.blk">
                  <option :value="0">未定义</option>
                  <option :value="1">有遮蔽顶</option>
                  <option :value="2">无遮蔽顶</option>
                </select>
              </label>
              <label class="apd-field compact"><span>打击方式</span>
                <select v-model.number="editedParam.figt">
                  <option :value="0">未定义</option>
                  <option :value="1">单发</option>
                  <option :value="2">多发</option>
                </select>
              </label>
              <label class="apd-field compact"><span>建议弹量</span><input v-model.number="editedParam.sug" type="number" /></label>
              <label class="apd-field compact"><span>实际弹量</span><input v-model.number="editedParam.ammo" type="number" /></label>
              <label class="apd-field compact"><span>策略</span><input v-model.number="editedParam.strategy" type="number" /></label>
            </div>
            <div class="apd-section">
              <div class="apd-section-title">侦察区域</div>
              <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
            </div>
          </template>
          <template v-else>
            <div class="apd-section">
              <div class="apd-section-title">侦察参数</div>
              <label class="apd-field"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            </div>
            <div class="apd-section">
              <div class="apd-section-title">侦察区域</div>
              <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
            </div>
          </template>
        </template>

        <!-- 11. 打击类（40mm / 机枪 / 红箭13 / 火箭弹 / 巡飞弹） -->
        <template v-else-if="isTargetListStrike">
          <div class="apd-section">
            <div class="apd-section-title">
              打击参数
              <div class="apd-btn-group">
                <button class="as-btn mini primary" type="button" @click="addTarget">+</button>
                <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removeTarget(editedParam.points.length - 1)">-</button>
              </div>
            </div>
            <div class="apd-target-table-head">
              <span>目标</span>
              <span>经度</span>
              <span>纬度</span>
              <span>高程</span>
              <span>类型</span>
              <span></span>
            </div>
            <div v-for="(t, idx) in editedParam.points" :key="idx" class="apd-target-table-row">
              <select v-model="t.target_ref" @change="onTargetRefChange(idx)">
                <option value="">-- 选择目标 --</option>
                <option v-for="target in targetList" :key="target.resource_id" :value="target.resource_id">
                  {{ target.target_name || target.title || target.resource_name || target.resource_id }}
                </option>
              </select>
              <input v-model.number="t.lon" type="number" step="0.000001" placeholder="经度" />
              <input v-model.number="t.lat" type="number" step="0.000001" placeholder="纬度" />
              <input v-model.number="t.alt" type="number" step="0.1" placeholder="高程" />
              <select v-model.number="t.tart">
                <option v-for="(label, val) in targetTypeOptions" :key="val" :value="Number(val)">{{ label }}</option>
              </select>
              <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removeTarget(idx)">删除</button>
            </div>
            <label v-if="normalizedActionType === 'rocket-launch'" class="apd-field compact">
              <span>打击类型</span>
              <select v-model.number="editedParam.type">
                <option :value="1">单点/多点打击</option>
                <option :value="2">区域打击</option>
              </select>
            </label>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            <label class="apd-field compact"><span>排序</span><input v-model.number="editedParam.sort" type="number" /></label>
            <label class="apd-field compact"><span>目标数量</span><input v-model.number="editedParam.num" type="number" /></label>
          </div>
        </template>

        <!-- 12. 激光照射 -->
        <template v-else-if="normalizedActionType === 'laser-illumination'">
          <div class="apd-section">
            <div class="apd-section-title">目标位置</div>
            <label class="apd-field compact"><span>经度</span><input v-model.number="editedParam.lon" type="number" step="0.000001" /></label>
            <label class="apd-field compact"><span>纬度</span><input v-model.number="editedParam.lat" type="number" step="0.000001" /></label>
            <label class="apd-field compact"><span>高度 (m)</span><input v-model.number="editedParam.alt" type="number" step="0.1" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">照射参数</div>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            <label class="apd-field compact"><span>动作标识</span><input v-model.number="editedParam.act" type="number" /></label>
            <label class="apd-field compact"><span>参数1</span><input v-model.number="editedParam.param1" type="number" /></label>
            <label class="apd-field compact"><span>参数2</span><input v-model.number="editedParam.param2" type="number" /></label>
            <label class="apd-field compact"><span>能量</span><input v-model.number="editedParam.ene" type="number" /></label>
            <label class="apd-field compact"><span>频率</span><input v-model.number="editedParam.freq" type="number" /></label>
            <label class="apd-field compact"><span>照射时长</span><input v-model.number="editedParam.meat" type="number" /></label>
            <label class="apd-field compact"><span>延迟</span><input v-model.number="editedParam.delay" type="number" /></label>
            <label class="apd-field compact"><span>最大次数/时长</span><input v-model.number="editedParam.max" type="number" /></label>
            <label class="apd-field compact"><span>类型</span><input v-model.number="editedParam.type" type="number" /></label>
            <label class="apd-field compact"><span>策略</span><input v-model.number="editedParam.strategy" type="number" /></label>
          </div>
        </template>

        <!-- 13. 强声拒止 / 强光拒止 -->
        <template v-else-if="isPatrolDeterrence">
          <div class="apd-section">
            <div class="apd-section-title">拒止参数</div>
            <label class="apd-field compact"><span>目标类型</span><input v-model.number="editedParam.tarty" type="number" /></label>
            <label class="apd-field compact"><span>运动属性</span>
              <select v-model.number="editedParam.attr">
                <option :value="0">未定义</option>
                <option :value="1">静止</option>
                <option :value="2">运动</option>
              </select>
            </label>
            <label class="apd-field compact"><span>威胁度</span><input v-model.number="editedParam.thr" type="number" min="0" max="100" /></label>
            <label class="apd-field compact"><span>毁伤要求</span>
              <select v-model.number="editedParam.dam">
                <option :value="0">未定义</option>
                <option :value="1">饱和攻击</option>
                <option :value="2">不饱和攻击</option>
              </select>
            </label>
            <label class="apd-field compact"><span>遮蔽顶</span>
              <select v-model.number="editedParam.blk">
                <option :value="0">未定义</option>
                <option :value="1">有遮蔽顶</option>
                <option :value="2">无遮蔽顶</option>
              </select>
            </label>
            <label class="apd-field compact"><span>打击方式</span>
              <select v-model.number="editedParam.figt">
                <option :value="0">未定义</option>
                <option :value="1">单发</option>
                <option :value="2">多发</option>
              </select>
            </label>
            <label class="apd-field compact"><span>建议弹量</span><input v-model.number="editedParam.sug" type="number" /></label>
            <label class="apd-field compact"><span>实际弹量</span><input v-model.number="editedParam.ammo" type="number" /></label>
            <label class="apd-field compact"><span>策略</span><input v-model.number="editedParam.strategy" type="number" /></label>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">作用区域</div>
            <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
          </div>
        </template>

        <!-- 14. 电磁侦察 / 电磁突击 -->
        <template v-else-if="isElectronic">
          <div class="apd-section">
            <div class="apd-section-title">侦察/干扰参数</div>
            <label class="apd-field">
              <span>模式</span>
              <select v-model.number="editedParam.mode">
                <option :value="1">单点探测</option>
                <option :value="3">四点区域探测</option>
                <option :value="4">定向探测</option>
              </select>
            </label>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            <label v-if="normalizedActionType === 'electronic-jamming'" class="apd-field compact"><span>排序</span><input v-model.number="editedParam.sort" type="number" /></label>
            <label class="apd-field compact"><span>数量</span><input v-model.number="editedParam.num" type="number" /></label>
            <label class="apd-field compact"><span>频段类型 (bit)</span><input v-model.number="editedParam.freqtype" type="number" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">工作频段</div>
            <div v-for="(f, idx) in editedParam.frequency" :key="idx" class="apd-freq-row">
              <input v-model.number="f.start" type="number" placeholder="起始频率 (Hz)" />
              <input v-model.number="f.end" type="number" placeholder="结束频率 (Hz)" />
              <button class="as-btn mini danger" type="button" @click="removeFreq(idx)">删</button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addFreq">+ 添加频段</button>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">侦察/干扰区域</div>
            <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
          </div>
          <div v-if="editedParam.mode === 4" class="apd-section">
            <div class="apd-section-title">定向探测参数</div>
            <label class="apd-field compact"><span>坐标系</span>
              <select v-model.number="editedParam.direct.type">
                <option :value="1">北天东</option>
                <option :value="2">车体坐标系</option>
              </select>
            </label>
            <label class="apd-field compact"><span>中心线角度 (×100)</span><input v-model.number="editedParam.direct.cent" type="number" /></label>
            <label class="apd-field compact"><span>搜索范围 (×100)</span><input v-model.number="editedParam.direct.sear" type="number" /></label>
            <label class="apd-field compact"><span>俯仰上边界 (×100)</span><input v-model.number="editedParam.direct.up" type="number" /></label>
            <label class="apd-field compact"><span>俯仰下边界 (×100)</span><input v-model.number="editedParam.direct.down" type="number" /></label>
            <label class="apd-field compact"><span>参考距离 (m)</span><input v-model.number="editedParam.direct.dist" type="number" /></label>
            <label class="apd-field compact"><span>传感器</span>
              <select v-model.number="editedParam.direct.sens">
                <option :value="0">自适应</option>
                <option :value="1">白光</option>
                <option :value="2">红外</option>
              </select>
            </label>
          </div>
          <div v-if="normalizedActionType === 'electronic-jamming'" class="apd-section">
            <div class="apd-section-title">保护频段</div>
            <label class="apd-field compact"><span>测控链-定频</span><input v-model="editedParam.protect.ckl_dp" type="text" /></label>
            <label class="apd-field compact"><span>测控链-跳频</span><input v-model="editedParam.protect.ckl_tp" type="text" /></label>
            <label class="apd-field compact"><span>协同链-定频</span><input v-model="editedParam.protect.zzw_dp" type="text" /></label>
            <label class="apd-field compact"><span>协同链-跳频</span><input v-model="editedParam.protect.zzw_tp" type="text" /></label>
            <label class="apd-field compact"><span>自主网-跳频</span><input v-model="editedParam.protect.xtl_tp" type="text" /></label>
            <label class="apd-field compact"><span>自主网-定频</span><input v-model="editedParam.protect.xtl_dp" type="text" /></label>
          </div>
        </template>

        <!-- 15. 载荷静默 -->
        <template v-else-if="normalizedActionType === 'payload-silent'">
          <div class="apd-section">
            <div class="apd-section-title">静默参数</div>
            <label class="apd-field"><span>静默时间 (s)</span><input v-model.number="editedParam.time" type="number" min="0" /></label>
          </div>
        </template>

        <template v-else>
          <div class="apd-empty">暂无该行动类型（{{ action?.action_type || '未知' }}）的参数定义</div>
        </template>

        <!-- 通用参数：仅对需要通用参数的底盘/载荷类显示 -->
        <div v-if="showCommonParams" class="apd-section">
          <div class="apd-section-title">通用参数</div>
          <label class="apd-field">
            <span>断连策略</span>
            <div class="apd-radio-row">
              <label class="apd-radio"><input v-model="editedParam.disconnect_strategy" type="radio" value="continue" /><span>继续</span></label>
              <label class="apd-radio"><input v-model="editedParam.disconnect_strategy" type="radio" value="stop" /><span>停车</span></label>
              <label class="apd-radio"><input v-model="editedParam.disconnect_strategy" type="radio" value="return" /><span>返航</span></label>
            </div>
          </label>
          <label class="apd-field"><span>任务时长 (HH:MM:SS)</span><input v-model="editedParam.mission_duration" type="text" placeholder="00:00:00" /></label>
          <label class="apd-field">
            <span class="apd-check"><input v-model="editedParam.enable_start_time" type="checkbox" /><span>设置开始时间</span></span>
            <input v-model="editedParam.start_time" type="datetime-local" :disabled="!editedParam.enable_start_time" />
          </label>
        </div>
      </div>

      <div class="apd-footer">
        <button class="as-btn" type="button" @click="onClose">取消</button>
        <button class="as-btn primary" type="button" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fetchResourcePoolByType } from '../../api/coordinationApi';
import AreaEditor from './AreaEditor.vue';

const props = defineProps({
  action: { type: Object, default: null },
  vehicleVid: { type: String, default: '' },
  vehicleType: { type: String, default: '' },
});

const emit = defineEmits(['close', 'save']);

const editedParam = ref({});
const routeList = ref([]);
const loadingRoutes = ref(false);
const targetList = ref([]);
const loadingTargets = ref(false);
const areaList = ref([]);
const loadingAreas = ref(false);

const normalizedActionType = computed(() => String(props.action?.action_type || '').toLowerCase());

const normalizedVehicleType = computed(() => {
  const rt = String(props.vehicleType || '').toLowerCase().replace(/-/g, '_');
  const map = {
    'chassis_ugv': 'chassis',
    'fire_support_ugv': 'fire_support',
    'recon_strike_ugv': 'recon_strike',
    'patrol_ugv': 'patrol',
    'electronic_ugv': 'electronic',
  };
  return map[rt] || '';
});

const isPatrolVehicle = computed(() => normalizedVehicleType.value === 'patrol');

const actionTypeLabel = computed(() => {
  const map = {
    'auto-move': '自主机动 / 循迹机动',
    'follow-move': '跟随机动',
    'silent-guard': '静默值守',
    'set-return-point': '设置返航点',
    'return-to-base': '开启返航',
    'formation-move': '编队机动',
    'manual-task': '人工任务',
    'pose-adjust': '姿态调整 / 车姿调整',
    'lens-recon': '光电侦察',
    'recon-strike': isPatrolVehicle.value ? '巡逻车侦察打击' : '侦察打击',
    '40mm-gun-launch': '40炮打击',
    'at-missile-launch': '红箭13导弹打击',
    'gun-shot': '机枪打击',
    'rocket-launch': '火箭弹打击',
    'loitering-munition-launch': '巡飞弹打击',
    'laser-illumination': '激光照射',
    'acoustic-deterrence': '强声拒止',
    'light-deterrence': '强光拒止',
    'electronic-recon': '电磁侦察',
    'electronic-jamming': '电磁突击 / 电磁干扰',
    'payload-silent': '载荷静默',
  };
  return map[normalizedActionType.value] || props.action?.action_type || '未知类型';
});

const vehicleName = computed(() =>
  String(props.vehicleVid || props.action?.vid || '').replace('equipment:', '')
);

const isTargetListStrike = computed(() =>
  ['40mm-gun-launch', 'gun-shot', 'at-missile-launch', 'rocket-launch', 'loitering-munition-launch']
    .includes(normalizedActionType.value)
);

const isPatrolDeterrence = computed(() =>
  ['acoustic-deterrence', 'light-deterrence'].includes(normalizedActionType.value)
);

const isElectronic = computed(() =>
  ['electronic-recon', 'electronic-jamming'].includes(normalizedActionType.value)
);

const showCommonParams = computed(() =>
  ['auto-move', 'follow-move', 'silent-guard', 'formation-move', 'manual-task', 'pose-adjust',
   'lens-recon', 'recon-strike', '40mm-gun-launch', 'gun-shot', 'at-missile-launch',
   'rocket-launch', 'loitering-munition-launch', 'laser-illumination',
   'acoustic-deterrence', 'light-deterrence', 'electronic-recon', 'electronic-jamming', 'payload-silent']
    .includes(normalizedActionType.value)
);

const targetTypeOptions = computed(() => ({
  0: '未定义',
  1: '人员',
  2: '汽车',
  3: '卡车',
  4: '装甲车辆',
  5: '越野车',
  6: '坦克',
  7: '炮兵阵地',
  8: '工事',
  9: '电台/基站',
  10: '武装直升机',
  11: '战术无人机',
  12: '巡航导弹',
  13: '火力阵地',
  14: '导弹发射基地',
  15: '武装人员',
  16: '工事火力点',
  17: '敌指挥节点',
  18: '通信枢纽',
  19: '地下空间',
  20: '其他',
}));

function cloneParam(param) {
  return JSON.parse(JSON.stringify(param || {}));
}

function defaultPoint() {
  return { lon: 116.13, lat: 39.766, alt: 55, radius: -1, type: 1 };
}

function defaultAreaPoint() {
  return { lon: 116.13, lat: 39.766, alt: 55 };
}

function defaultStrikePoint() {
  return { lon: 116.407, lat: 39.904, alt: 35, tart: 6, attr: 1, thr: 80, dam: 1, blk: 2, figt: 2, sug: 3, target_ref: '' };
}

function defaultDirect() {
  return { type: 1, cent: 9000, sear: 6000, up: 3000, down: -1000, dist: 2000, sens: 0 };
}

function ensureShape() {
  const type = normalizedActionType.value;
  const vt = normalizedVehicleType.value;
  const p = cloneParam(props.action?.param);

  if (type === 'auto-move') {
    p.points = Array.isArray(p.points) && p.points.length ? p.points : [defaultPoint(), defaultPoint()];
    p.limited_speed = p.limited_speed ?? 20;
    p.safe_mode = p.safe_mode ?? 0;
    p.loop_mode = p.loop_mode ?? 0;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'follow-move') {
    p.x = p.x ?? 960;
    p.y = p.y ?? 540;
    p.width = p.width ?? 1920;
    p.height = p.height ?? 1080;
    p.distance = p.distance ?? 10;
    p.limited_speed = p.limited_speed ?? 15;
    p.safe_mode = p.safe_mode ?? 0;
    p.strategy = p.strategy ?? 0;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'silent-guard') {
    p.time = p.time ?? 300;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'set-return-point' || type === 'return-to-base') {
    // 无参数
  } else if (type === 'formation-move') {
    p.points = Array.isArray(p.points) && p.points.length ? p.points : [defaultPoint(), defaultPoint()];
    p.limited_speed = p.limited_speed ?? 20;
    p.formation_mode = p.formation_mode ?? 0;
    p.safe_mode = p.safe_mode ?? 0;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'manual-task') {
    p.type = p.type ?? 1;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'pose-adjust') {
    p.pose = Array.isArray(p.pose) ? p.pose : [9000, 0, 0];
    p.pose_deviation = Array.isArray(p.pose_deviation) ? p.pose_deviation : [36100, 9100, 9100];
    p.limited_speed = p.limited_speed ?? 10;
    p.safe_mode = p.safe_mode ?? 0;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'lens-recon') {
    p.type = p.type ?? 2;
    p.mode = p.mode ?? 3;
    p.time = p.time ?? 120;
    p.area = Array.isArray(p.area) ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    p.direct = p.direct && typeof p.direct === 'object' ? p.direct : defaultDirect();
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'recon-strike') {
    p.time = p.time ?? 180;
    p.area = Array.isArray(p.area) ? p.area : [defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    if (vt === 'patrol') {
      p.tarty = p.tarty ?? 6;
      p.attr = p.attr ?? 1;
      p.thr = p.thr ?? 80;
      p.dam = p.dam ?? 1;
      p.blk = p.blk ?? 2;
      p.figt = p.figt ?? 2;
      p.sug = p.sug ?? 3;
      p.ammo = p.ammo ?? 10;
      p.strategy = p.strategy ?? 0;
    }
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (isTargetListStrike.value) {
    p.points = Array.isArray(p.points) && p.points.length ? p.points.map(pt => ({ ...pt, target_ref: pt.target_ref || '' })) : [defaultStrikePoint()];
    p.time = p.time ?? 60;
    p.sort = p.sort ?? 0;
    p.num = p.num ?? p.points.length;
    if (type === 'rocket-launch') p.type = p.type ?? 1;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'laser-illumination') {
    p.time = p.time ?? 120;
    p.act = p.act ?? 1;
    p.param1 = p.param1 ?? 0;
    p.param2 = p.param2 ?? 0;
    p.ene = p.ene ?? 80;
    p.freq = p.freq ?? 1000;
    p.meat = p.meat ?? 30;
    p.delay = p.delay ?? 5;
    p.max = p.max ?? 10;
    p.type = p.type ?? 1;
    p.strategy = p.strategy ?? 0;
    p.lon = p.lon ?? 116.407;
    p.lat = p.lat ?? 39.904;
    p.alt = p.alt ?? 2100;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (isPatrolDeterrence.value) {
    p.time = p.time ?? 60;
    p.tarty = p.tarty ?? 1;
    p.attr = p.attr ?? 2;
    p.thr = p.thr ?? 50;
    p.dam = p.dam ?? 0;
    p.blk = p.blk ?? 0;
    p.figt = p.figt ?? 0;
    p.sug = p.sug ?? 0;
    p.ammo = p.ammo ?? 0;
    p.strategy = p.strategy ?? 0;
    p.area = Array.isArray(p.area) ? p.area : [defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (isElectronic.value) {
    p.mode = p.mode ?? 3;
    p.time = p.time ?? 300;
    p.num = p.num ?? 1;
    p.freqtype = p.freqtype ?? 62;
    p.frequency = Array.isArray(p.frequency) ? p.frequency : [{ start: 30000000, end: 18000000000 }];
    p.area = Array.isArray(p.area) ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    p.direct = p.direct && typeof p.direct === 'object' ? p.direct : defaultDirect();
    if (type === 'electronic-jamming') {
      p.sort = p.sort ?? 1;
      p.protect = p.protect && typeof p.protect === 'object' ? p.protect : {
        ckl_dp: '30.0,100.0', ckl_tp: '100.0,200.0',
        zzw_dp: '400.0,500.0', zzw_tp: '500.0,600.0',
        xtl_tp: '700.0,800.0', xtl_dp: '800.0,900.0',
      };
    }
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'payload-silent') {
    p.time = p.time ?? 300;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  }

  editedParam.value = p;
}

let routeInitDone = false;
let areaInitDone = false;
let targetInitDone = false;

watch(() => props.action, () => {
  routeInitDone = false;
  areaInitDone = false;
  targetInitDone = false;
  ensureShape();
  initFromRouteSelection();
  initFromAreaSelection();
  initFromTargetSelection();
}, { immediate: true });

watch(routeList, (list) => {
  if (list.length && !routeInitDone) {
    routeInitDone = true;
    initFromRouteSelection();
  }
});

watch(areaList, (list) => {
  if (list.length && !areaInitDone) {
    areaInitDone = true;
    initFromAreaSelection();
  }
});

watch(targetList, (list) => {
  if (list.length && !targetInitDone) {
    targetInitDone = true;
    initFromTargetSelection();
  }
});

onMounted(() => {
  loadRoutes();
  loadTargets();
  loadAreas();
});

async function loadRoutes() {
  loadingRoutes.value = true;
  try {
    const result = await fetchResourcePoolByType('ROUTE', 50);
    if (result.ok) routeList.value = result.data?.items || [];
  } finally {
    loadingRoutes.value = false;
  }
}

async function loadAreas() {
  loadingAreas.value = true;
  try {
    const result = await fetchResourcePoolByType('AREA', 50);
    if (result.ok) areaList.value = result.data?.items || [];
  } finally {
    loadingAreas.value = false;
  }
}

async function loadTargets() {
  loadingTargets.value = true;
  try {
    const result = await fetchResourcePoolByType('TARGET', 50);
    if (result.ok) targetList.value = result.data?.items || [];
  } finally {
    loadingTargets.value = false;
  }
}

function onRouteChange() {
  const route = routeList.value.find((r) => r.resource_id === editedParam.value.route_id);
  if (route && Array.isArray(route.points)) {
    editedParam.value.points = route.points.map((pt) => ({
      lon: pt?.lon ?? pt?.longitude ?? 0,
      lat: pt?.lat ?? pt?.latitude ?? 0,
      alt: pt?.alt ?? pt?.altitude ?? 0,
      radius: pt?.radius ?? -1,
      type: pt?.type ?? 1,
    }));
  }
}

function initFromRouteSelection() {
  if (!editedParam.value.route_id || !routeList.value.length) return;
  onRouteChange();
}

function applyAreaFromList() {
  const area = areaList.value.find((a) => a.resource_id === editedParam.value.area_id);
  if (area && Array.isArray(area.polygon)) {
    editedParam.value.area = area.polygon.map((pt) => ({
      lon: pt?.lon ?? pt?.longitude ?? 0,
      lat: pt?.lat ?? pt?.latitude ?? 0,
      alt: pt?.alt ?? pt?.altitude ?? 0,
    }));
  }
}

function onAreaChange() {
  applyAreaFromList();
}

function initFromAreaSelection() {
  if (!editedParam.value.area_id || !areaList.value.length) return;
  applyAreaFromList();
}

function initFromTargetSelection() {
  if (!Array.isArray(editedParam.value.points) || !targetList.value.length) return;
  editedParam.value.points.forEach((pt) => {
    if (!pt.target_ref) return;
    const target = targetList.value.find((item) => item.resource_id === pt.target_ref);
    if (target) {
      const loc = target.location || {};
      pt.lon = Number(loc.longitude ?? loc.lon ?? 0);
      pt.lat = Number(loc.latitude ?? loc.lat ?? 0);
      pt.alt = Number(loc.altitude ?? loc.alt ?? 0);
    }
  });
}

function addPoint(field) {
  const defaults = { points: defaultPoint, area: defaultAreaPoint };
  editedParam.value[field].push(defaults[field] ? defaults[field]() : defaultPoint());
}

function removePoint(field, idx) {
  if (editedParam.value[field].length > 1) editedParam.value[field].splice(idx, 1);
}

function addTarget() {
  editedParam.value.points.push(defaultStrikePoint());
}

function removeTarget(idx) {
  if (editedParam.value.points.length > 1) editedParam.value.points.splice(idx, 1);
}

function onTargetRefChange(idx) {
  const t = editedParam.value.points[idx];
  const target = targetList.value.find((item) => item.resource_id === t.target_ref);
  if (target) {
    const loc = target.location || {};
    t.lon = Number(loc.longitude ?? loc.lon ?? 0);
    t.lat = Number(loc.latitude ?? loc.lat ?? 0);
    t.alt = Number(loc.altitude ?? loc.alt ?? 0);
  }
}

function addFreq() {
  editedParam.value.frequency.push({ start: 30000000, end: 18000000000 });
}

function removeFreq(idx) {
  editedParam.value.frequency.splice(idx, 1);
}

function onClose() {
  emit('close');
}

function onSave() {
  const cleaned = JSON.parse(JSON.stringify(editedParam.value));
  // 清理辅助字段：target_ref 仅用于 UI 选择，不下发
  if (Array.isArray(cleaned.points)) {
    cleaned.points = cleaned.points.map(({ target_ref, ...rest }) => rest);
  }
  emit('save', cleaned);
}
</script>

<style scoped>
.apd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apd-dialog {
  background: linear-gradient(180deg, rgba(0, 40, 48, 0.98), rgba(0, 16, 22, 0.99));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  width: 620px;
  max-width: 94vw;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  color: #f1feff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.apd-header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  flex-direction: column;
  position: relative;
}

.apd-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f7fdff;
}

.apd-subtitle {
  font-size: 0.78rem;
  color: rgba(226, 246, 248, 0.65);
  margin-top: 0.15rem;
}

.apd-close {
  position: absolute;
  right: 0.6rem;
  top: 0.55rem;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apd-close:hover {
  background: rgba(239, 68, 68, 0.35);
}

.apd-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.apd-section {
  background: rgba(0, 222, 200, 0.05);
  border: 1px solid rgba(0, 222, 200, 0.12);
  border-radius: 8px;
  padding: 0.75rem;
}

.apd-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #00dec8;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.apd-section-title.sub {
  font-size: 0.78rem;
  color: rgba(0, 222, 200, 0.8);
  margin-top: 0.5rem;
}

.apd-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.55rem;
}

.apd-field > span:first-child {
  font-size: 0.75rem;
  color: rgba(226, 246, 248, 0.8);
}

.apd-field.compact {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 0.5rem;
}

.apd-field input,
.apd-field select,
.apd-field textarea {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 5px;
  padding: 0.35rem 0.5rem;
  color: #f1feff;
  font-size: 0.82rem;
}

.apd-field input:focus,
.apd-field select:focus {
  outline: none;
  border-color: rgba(0, 222, 200, 0.55);
}

.apd-field input:disabled,
.apd-field select:disabled {
  opacity: 0.45;
}

.apd-radio-row,
.apd-check-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.apd-radio,
.apd-check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.apd-radio input,
.apd-check input {
  accent-color: #00dec8;
}

.apd-route-table-head,
.apd-target-table-head {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.9fr 0.9fr 0.9fr 0.6fr;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: rgba(226, 246, 248, 0.65);
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.apd-target-table-head {
  grid-template-columns: 1.2fr 1fr 1fr 0.7fr 1fr 0.6fr;
}

.apd-route-table-row,
.apd-target-table-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.9fr 0.9fr 0.9fr 0.6fr;
  gap: 0.3rem;
  align-items: center;
  padding: 0.25rem 0;
}

.apd-target-table-row {
  grid-template-columns: 1.2fr 1fr 1fr 0.7fr 1fr 0.6fr;
}

.apd-route-table-row input,
.apd-target-table-row input,
.apd-route-table-row select,
.apd-target-table-row select {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.25rem 0.3rem;
  color: #f1feff;
  font-size: 0.75rem;
}

.apd-freq-row {
  display: grid;
  grid-template-columns: 1fr 1fr 0.6fr;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}

.apd-freq-row input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.3rem 0.45rem;
  color: #f1feff;
  font-size: 0.78rem;
}

.apd-btn-group {
  display: flex;
  gap: 0.35rem;
}

.apd-empty {
  text-align: center;
  color: rgba(226, 246, 248, 0.55);
  padding: 1rem 0;
  font-size: 0.85rem;
}

.apd-empty.small {
  padding: 0.5rem 0;
  font-size: 0.78rem;
}

.apd-footer {
  padding: 0.85rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.as-btn {
  background: rgba(0, 222, 200, 0.12);
  border: 1px solid rgba(0, 222, 200, 0.25);
  border-radius: 5px;
  color: #f1feff;
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.as-btn:hover {
  background: rgba(0, 222, 200, 0.2);
}

.as-btn.primary {
  background: rgba(0, 222, 200, 0.75);
  color: #001016;
  font-weight: 700;
}

.as-btn.primary:hover {
  background: rgba(0, 222, 200, 0.9);
}

.as-btn.mini {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
}

.as-btn.danger {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.45);
}

.as-btn.danger:hover {
  background: rgba(239, 68, 68, 0.4);
}

.as-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
