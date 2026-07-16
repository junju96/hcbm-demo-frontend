<template>
  <div class="apd-overlay" @click.self="onClose">
    <div class="apd-dialog">
      <div class="apd-header">
        <div class="apd-title">{{ actionTypeLabel || action?.name || '行动参数' }}</div>
        <div class="apd-subtitle">{{ action?.name || '' }} · {{ vehicleName }}</div>
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
              <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removePoint('points', idx)">删除</button>
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
              <span>安全模式</span>
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
              <span>安全模式</span>
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

        <!-- 6. 人工任务 -->
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
            <label class="apd-field compact"><span>航向偏差 (×100)</span><input v-model.number="editedParam.pose_deviation[0]" type="number" /></label>
            <label class="apd-field compact"><span>俯仰偏差 (×100)</span><input v-model.number="editedParam.pose_deviation[1]" type="number" /></label>
            <label class="apd-field compact"><span>倾斜偏差 (×100)</span><input v-model.number="editedParam.pose_deviation[2]" type="number" /></label>
            <label class="apd-field compact"><span>限速 (km/h)</span><input v-model.number="editedParam.limited_speed" type="number" /></label>
          </div>
        </template>

        <!-- 9. 空中侦察 -->
        <template v-else-if="normalizedActionType === 'air-recon'">
          <div class="apd-section">
            <div class="apd-section-title">侦察参数</div>
            <label class="apd-field">
              <span>侦察类型</span>
              <select v-model.number="editedParam.type">
                <option :value="1">区域</option>
                <option :value="2">定点</option>
              </select>
            </label>
            <label class="apd-field">
              <span>侦察模式</span>
              <select v-model.number="editedParam.mode">
                <option :value="1">侦察</option>
                <option :value="2">侦察跟踪</option>
              </select>
            </label>
            <label class="apd-field"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">航路点列表</div>
            <div v-for="(pt, idx) in editedParam.points" :key="idx" class="apd-air-point">
              <div class="apd-air-row">
                <label class="apd-air-cell"><span>经度</span><input v-model.number="pt.lon" type="number" step="0.000001" /></label>
                <label class="apd-air-cell"><span>纬度</span><input v-model.number="pt.lat" type="number" step="0.000001" /></label>
                <label class="apd-air-cell"><span>高度</span><input v-model.number="pt.alt" type="number" step="0.1" /></label>
                <label class="apd-air-cell"><span>航点类型</span>
                  <select v-model.number="pt.type">
                    <option :value="0">普通</option>
                    <option :value="1">起飞</option>
                    <option :value="2">降落</option>
                    <option :value="5">返航</option>
                  </select>
                </label>
                <label class="apd-air-cell"><span>速度</span><input v-model.number="pt.speed" type="number" /></label>
                <label class="apd-air-cell"><span>相机</span>
                  <select v-model.number="pt.camera">
                    <option :value="1">无</option>
                    <option :value="2">拍照</option>
                    <option :value="4">开始录像</option>
                    <option :value="5">停止录像</option>
                    <option :value="6">识别上报</option>
                    <option :value="7">识别上报并追踪</option>
                  </select>
                </label>
              </div>
              <div class="apd-air-row">
                <label class="apd-air-cell"><span>俯仰</span><input v-model.number="pt.gimpitch" type="number" /></label>
                <label class="apd-air-cell"><span>偏航</span><input v-model.number="pt.gimyaw" type="number" /></label>
                <label class="apd-air-cell"><span>动作</span>
                  <select v-model.number="pt.action">
                    <option :value="0">短停</option>
                    <option :value="1">通过</option>
                  </select>
                </label>
                <label class="apd-air-cell"><span>朝向</span><input v-model.number="pt.playaw" type="number" /></label>
                <label class="apd-air-cell"><span>倍率</span><input v-model.number="pt.zoom" type="number" /></label>
                <label class="apd-air-cell"><span>悬停</span><input v-model.number="pt.loiter" type="number" /></label>
                <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removePoint('points', idx)">删除</button>
              </div>
            </div>
            <button class="as-btn mini primary" type="button" @click="addPoint('points')">+ 添加航路点</button>
          </div>
        </template>

        <template v-else-if="isLensReconLike">
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
            <div class="apd-section-title">侦察区域</div>
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
        </template>

        <!-- 10. 侦察打击（非巡逻车） -->
        <template v-else-if="['recon-strike', 'search-and-shoot'].includes(normalizedActionType) && !isPatrolVehicle">
          <div class="apd-section">
            <div class="apd-section-title">侦察参数</div>
            <label class="apd-field"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">侦察区域</div>
            <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
          </div>
        </template>

        <!-- 11. 打击类（40mm / 红箭13 / 火箭弹 / 巡飞弹） -->
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
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            <label class="apd-check">
              <input v-model.number="editedParam.sort" type="checkbox" :true-value="1" :false-value="0" />
              <span>按顺序打击</span>
            </label>
          </div>
        </template>

        <!-- 11.5 机枪打击（简化版） -->
        <template v-else-if="normalizedActionType === 'gun-shot' || normalizedActionType === '7.62mm-gun-shot'">
          <div class="apd-section">
            <div class="apd-section-title">
              打击参数
              <div class="apd-btn-group">
                <button class="as-btn mini primary" type="button" @click="addGunShotPoint">+</button>
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
                  {{ target.title || target.resource_name || target.resource_id }}
                </option>
              </select>
              <input
                :value="formatCoord(t.lon, 6)"
                type="text"
                inputmode="decimal"
                placeholder="经度"
                @blur="t.lon = parseCoordInput($event.target.value, 6)"
              />
              <input
                :value="formatCoord(t.lat, 6)"
                type="text"
                inputmode="decimal"
                placeholder="纬度"
                @blur="t.lat = parseCoordInput($event.target.value, 6)"
              />
              <input
                :value="formatCoord(t.alt, 1)"
                type="text"
                inputmode="decimal"
                placeholder="高程"
                @blur="t.alt = parseCoordInput($event.target.value, 1)"
              />
              <select v-model.number="t.tart">
                <option v-for="(label, val) in targetTypeOptions" :key="val" :value="Number(val)">{{ label }}</option>
              </select>
              <button class="as-btn mini danger" type="button" :disabled="editedParam.points.length <= 1" @click="removeTarget(idx)">删除</button>
            </div>
            <label class="apd-check">
              <input v-model.number="editedParam.sort" type="checkbox" :true-value="1" :false-value="0" />
              <span>按顺序打击</span>
            </label>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
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

        <!-- 14. 电磁侦察 / 电磁突击 / 电磁干扰 -->
        <template v-else-if="isElectronic">
          <div class="apd-section">
            <div class="apd-section-title">侦察/干扰参数</div>
            <label class="apd-field compact"><span>任务时间 (s)</span><input v-model.number="editedParam.time" type="number" /></label>
            <div class="apd-field">
              <span>频段类型</span>
              <div class="apd-check-row">
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(0)" @change="toggleFreqBit(0, $event.target.checked)" /><span>全频段</span></label>
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(1)" @change="toggleFreqBit(1, $event.target.checked)" /><span>通信</span></label>
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(2)" @change="toggleFreqBit(2, $event.target.checked)" /><span>链路</span></label>
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(3)" @change="toggleFreqBit(3, $event.target.checked)" /><span>雷达</span></label>
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(4)" @change="toggleFreqBit(4, $event.target.checked)" /><span>导航</span></label>
                <label class="apd-check"><input type="checkbox" :checked="isFreqBitSet(5)" @change="toggleFreqBit(5, $event.target.checked)" /><span>敌我识别</span></label>
              </div>
            </div>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">工作频段</div>
            <div v-for="(f, idx) in editedParam.frequency" :key="idx" class="apd-freq-row">
              <input v-model.number="f.start" type="number" placeholder="起始频率 (Hz)" />
              <input v-model.number="f.end" type="number" placeholder="结束频率 (Hz)" />
              <button class="as-btn mini danger" type="button" @click="removeFreq(idx)">删除</button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addFreq">+ 添加频段</button>
          </div>
          <div class="apd-section">
            <div class="apd-section-title">侦察/干扰区域</div>
            <AreaEditor v-model="editedParam.area" :area-list="areaList" v-model:area-id="editedParam.area_id" />
          </div>
          <div v-if="normalizedActionType === 'em-interference' || normalizedActionType === 'electronic-jamming' || normalizedActionType === 'em-assault' || normalizedActionType === 'electronic-assault'" class="apd-section">
            <div class="apd-section-title">保护频段</div>
            <div class="apd-protect-group">
              <div class="apd-protect-group-title">测控链频段</div>
              <label class="apd-field compact"><span>定频 (MHz)</span><input v-model="editedParam.protect.ckl_dp" type="text" /></label>
              <label class="apd-field compact"><span>跳频 (表号)</span><input v-model="editedParam.protect.ckl_tp" type="text" /></label>
            </div>
            <div class="apd-protect-group">
              <div class="apd-protect-group-title">协同链频段</div>
              <label class="apd-field compact"><span>定频 (MHz)</span><input v-model="editedParam.protect.zzw_dp" type="text" /></label>
              <label class="apd-field compact"><span>跳频 (表号)</span><input v-model="editedParam.protect.zzw_tp" type="text" /></label>
            </div>
            <div class="apd-protect-group">
              <div class="apd-protect-group-title">自主网频段</div>
              <label class="apd-field compact"><span>定频 (MHz)</span><input v-model="editedParam.protect.xtl_dp" type="text" /></label>
              <label class="apd-field compact"><span>跳频 (表号)</span><input v-model="editedParam.protect.xtl_tp" type="text" /></label>
            </div>
          </div>
        </template>

        <!-- 15. 载荷静默（旧数据兼容） -->
        <template v-else-if="normalizedActionType === 'payload-silent'">
          <div class="apd-section">
            <div class="apd-section-title">静默参数</div>
            <label class="apd-field"><span>静默时间 (s)</span><input v-model.number="editedParam.time" type="number" min="0" /></label>
          </div>
        </template>

        <template v-else>
          <div class="apd-empty">
            暂无该行动类型（{{ action?.action_type || '未知' }} / {{ normalizedActionType }}）的参数定义
          </div>
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
import { fetchFusionedTargets } from '../../api/coordinationApi';
import AreaEditor from './AreaEditor.vue';
import { normalizeActionParam, serializeActionParam } from './actionParamNormalizer';

const props = defineProps({
  action: { type: Object, default: null },
  vehicleVid: { type: String, default: '' },
  vehicleType: { type: String, default: '' },
});

const emit = defineEmits(['close', 'save', 'cancel']);

const editedParam = ref({});
const fusionedTargets = ref([]);
const loadingFusioned = ref(false);

const STANDARD_ACTION_TYPES = new Set([
  'auto-move', 'follow-move', 'silent-guard', 'set-return-point', 'return-to-base',
  'manual-task', 'pose-adjust', 'air-recon', 'lens-recon',
  'search-and-shoot', 'recon-strike', '40mm-gun-launch', 'at-missile-launch',
  'gun-shot', '7.62mm-gun-shot', 'rocket-launch', 'loitering-munition-launch',
  'laser-illumination', 'sound-expel', 'acoustic-deterrence', 'light-expel',
  'light-deterrence', 'em-recon', 'electronic-recon', 'em-assault', 'electronic-assault',
  'em-interference', 'electronic-jamming',
  // payload-silent 仅作旧数据兼容
  'payload-silent',
]);

function inferActionTypeFromId(actionId) {
  if (!actionId) return '';
  const aid = String(actionId).toLowerCase().replace(/_/g, '-');
  const semanticMatch = aid.match(/^action:([a-z0-9.\-]+):/);
  if (semanticMatch) {
    const mapping = {
      'auto-move': 'auto-move', 'follow-move': 'follow-move', 'silent-guard': 'silent-guard',
      'set-return-point': 'set-return-point', 'return-to-base': 'return-to-base',
      'manual-task': 'manual-task', 'pose-adjust': 'pose-adjust',
      'air-recon': 'air-recon', 'lens-recon': 'lens-recon', 'search-and-shoot': 'search-and-shoot',
      'recon-strike': 'search-and-shoot', '40mm-gun-launch': '40mm-gun-launch',
      'at-missile-launch': 'at-missile-launch', 'gun-shot': '7.62mm-gun-shot',
      '7.62mm-gun-shot': '7.62mm-gun-shot', 'rocket-launch': 'rocket-launch',
      'loitering-munition-launch': 'loitering-munition-launch', 'laser-illumination': 'laser-illumination',
      'sound-expel': 'sound-expel', 'acoustic-deterrence': 'sound-expel', 'light-expel': 'light-expel',
      'light-deterrence': 'light-expel', 'em-recon': 'em-recon', 'electronic-recon': 'em-recon',
      'em-assault': 'em-assault', 'electronic-assault': 'em-assault',
      'em-interference': 'em-interference', 'electronic-jamming': 'em-interference',
      // payload-silent 仅作旧数据兼容
      'payload-silent': 'payload-silent',
    };
    if (semanticMatch[1] in mapping) return mapping[semanticMatch[1]];
  }
  const projectMapping = {
    'ch-move': 'auto-move', 'ch-follow': 'follow-move', 'ch-silent': 'silent-guard',
    'ch-set-return': 'set-return-point', 'ch-return': 'return-to-base',
    'ch-manual': 'manual-task', 'ch-pose': 'pose-adjust',
    'fs-lens': 'lens-recon', 'fs-recon-strike': 'search-and-shoot', 'fs-gun': '7.62mm-gun-shot',
    'fs-rocket': 'rocket-launch', 'fs-loiter': 'loitering-munition-launch',
    'rs-lens': 'lens-recon', 'rs-recon-strike': 'search-and-shoot', 'rs-40mm': '40mm-gun-launch',
    'rs-at': 'at-missile-launch', 'rs-gun': '7.62mm-gun-shot', 'rs-laser': 'laser-illumination',
    'pt-lens': 'lens-recon', 'pt-recon-strike': 'search-and-shoot', 'pt-gun': '7.62mm-gun-shot',
    'pt-acoustic': 'sound-expel', 'pt-light': 'light-expel',
    'ag-air-recon': 'air-recon', 'el-recon': 'em-recon',
    'el-assault': 'em-assault', 'el-jam': 'em-interference',
    // el-silent 映射到载荷静默（旧数据兼容）
    'el-silent': 'payload-silent',
  };
  if (aid in projectMapping) return projectMapping[aid];
  return '';
}

function inferActionTypeFromName(name) {
  if (!name) return '';
  const map = {
    '自主机动': 'auto-move', '跟随机动': 'follow-move', '静默值守': 'silent-guard',
    '设置返航点': 'set-return-point', '开启返航': 'return-to-base',
    '人工任务': 'manual-task', '姿态调整': 'pose-adjust', '空中侦察': 'air-recon',
    '光电侦察': 'lens-recon', '侦察打击': 'search-and-shoot', '巡逻车侦察打击': 'search-and-shoot',
    '机枪打击': '7.62mm-gun-shot', '火箭弹打击': 'rocket-launch', '巡飞弹打击': 'loitering-munition-launch',
    '40炮打击': '40mm-gun-launch', '红箭13导弹打击': 'at-missile-launch', '激光照射': 'laser-illumination',
    '强声拒止': 'sound-expel', '强光拒止': 'light-expel',
    '电磁侦察': 'em-recon', '电磁突击': 'em-assault', '电磁干扰': 'em-interference',
    '载荷静默': 'payload-silent',
  };
  if (name in map) return map[name];
  const compact = name.toLowerCase().replace(/[-_.\s]/g, '');
  const enMap = {
    'automove': 'auto-move', 'followmove': 'follow-move', 'silentguard': 'silent-guard',
    'setreturnpoint': 'set-return-point', 'setreturn': 'set-return-point', 'returntobase': 'return-to-base',
    'return': 'return-to-base', 'manualtask': 'manual-task',
    'manual': 'manual-task', 'poseadjust': 'pose-adjust', 'airrecon': 'air-recon',
    'lensrecon': 'lens-recon', 'searchandshoot': 'search-and-shoot', 'reconstrike': 'search-and-shoot',
    '40mmgunlaunch': '40mm-gun-launch', '40mmgun': '40mm-gun-launch', 'atmissilelaunch': 'at-missile-launch',
    'atmissile': 'at-missile-launch', 'gunshot': '7.62mm-gun-shot', '762mmgunshot': '7.62mm-gun-shot',
    '762mmgun': '7.62mm-gun-shot', 'rocketlaunch': 'rocket-launch', 'loiteringmunitionlaunch': 'loitering-munition-launch',
    'loiteringmunition': 'loitering-munition-launch', 'laserillumination': 'laser-illumination',
    'laser': 'laser-illumination', 'soundexpel': 'sound-expel', 'acousticdeterrence': 'sound-expel',
    'lightexpel': 'light-expel', 'lightdeterrence': 'light-expel', 'emrecon': 'em-recon',
    'electronicrecon': 'em-recon', 'emassault': 'em-assault', 'electronicassault': 'em-assault',
    'eminterference': 'em-interference', 'electronicjamming': 'em-interference',
    'payloadsilent': 'payload-silent',
  };
  return enMap[compact] || '';
}

function inferActionTypeFromParam(param) {
  if (!param || typeof param !== 'object') return '';
  const p = param;
  const keys = Object.keys(p);
  const businessKeys = keys.filter((k) => !['disconnect_strategy', 'mission_duration', 'enable_start_time', 'start_time', 'sid', 'id'].includes(k));
  const businessHas = (k) => businessKeys.includes(k);

  // 激光照射
  if (['ene', 'freq', 'meat'].some((k) => businessHas(k))) return 'laser-illumination';
  // 空中侦察
  if (businessHas('points') && Array.isArray(p.points) && p.points.length > 0) {
    const first = p.points[0];
    if (first && typeof first === 'object' && ('camera' in first || 'speed' in first || 'gimpitch' in first)) {
      return 'air-recon';
    }
  }
  // 光电侦察：area + direct
  if (businessHas('area') && businessHas('direct')) return 'lens-recon';
  // 侦察打击：有 area 但没 direct
  if (businessHas('area') && !businessHas('direct')) return 'search-and-shoot';
  // 光电侦察：area + direct
  if (businessHas('area') && businessHas('direct')) return 'lens-recon';
  // 侦察打击：有 area 但没 direct
  if (businessHas('area') && !businessHas('direct')) return 'search-and-shoot';
  // 静默值守：只有 time
  if (businessKeys.length === 1 && businessHas('time')) return 'silent-guard';
  // 自主机动：points + limited_speed
  if (businessHas('points') && businessHas('limited_speed')) return 'auto-move';
  // 跟随机动
  if (businessHas('distance') && businessHas('x') && businessHas('y')) return 'follow-move';
  // 姿态调整
  if (businessHas('pose')) return 'pose-adjust';
  // 人工任务
  if (businessKeys.length === 1 && businessHas('type')) return 'manual-task';
  return '';
}

const routeList = computed(() =>
  fusionedTargets.value.filter((t) => ['line', 'route'].includes(t.target_shape) && t.points.length > 0)
);
const areaList = computed(() =>
  fusionedTargets.value.filter((t) => t.target_shape === 'region' && t.points.length > 0)
);
const targetList = computed(() =>
  fusionedTargets.value.filter((t) => t.target_shape === 'point' && t.points.length > 0)
);
const loadingRoutes = computed(() => loadingFusioned.value);
const loadingAreas = computed(() => loadingFusioned.value);
const loadingTargets = computed(() => loadingFusioned.value);

const normalizedActionType = computed(() => {
  // 兼容下划线格式（如 SEARCH_AND_SHOOT、AUTO_MOVE）与中划线格式（如 search-and-shoot）
  const raw = String(props.action?.action_type || '').toLowerCase().replace(/_/g, '-');
  if (STANDARD_ACTION_TYPES.has(raw)) {
    console.log('[ActionParamDialog] standard action_type:', props.action?.action_type, 'normalized:', raw);
    return raw;
  }
  // action_type 被脏数据污染（如 FS_LENS / Return-To-Base / Unknown_Action）时，
  // 依次按 action_id / param 结构 / name 推断，与后端 _resolve_action_type 保持一致
  const inferred = inferActionTypeFromId(props.action?.action_id)
    || inferActionTypeFromParam(props.action?.param)
    || inferActionTypeFromName(props.action?.name);
  if (inferred) {
    console.log('[ActionParamDialog] inferred action_type from id/param/name:', inferred, 'original:', props.action?.action_type);
    return inferred;
  }
  console.log('[ActionParamDialog] raw action_type:', props.action?.action_type, 'normalized:', raw);
  return raw;
});

const normalizedVehicleType = computed(() => {
  const rt = String(props.vehicleType || '').toLowerCase().replace(/-/g, '_');
  const map = {
    'fire_support_ugv': 'fire_support',
    'recon_strike_ugv': 'recon_strike',
    'patrol_ugv': 'patrol',
    'electronic_ugv': 'electronic',
    'air_ground_uav': 'air_ground',
    'air_ground_ugv': 'air_ground',
  };
  return map[rt] || '';
});

const isPatrolVehicle = computed(() => normalizedVehicleType.value === 'patrol');

// 巡逻车的侦察打击 / 强声拒止 / 强光拒止使用与光电侦察完全相同的编辑界面与数据格式
const isLensReconLike = computed(() => {
  if (normalizedActionType.value === 'lens-recon') return true;
  if (!isPatrolVehicle.value) return false;
  return ['search-and-shoot', 'recon-strike', 'sound-expel', 'acoustic-deterrence', 'light-expel', 'light-deterrence']
    .includes(normalizedActionType.value);
});

const actionTypeLabel = computed(() => {
  const map = {
    'auto-move': '自主机动 / 循迹机动',
    'follow-move': '跟随机动',
    'silent-guard': '静默值守',
    'set-return-point': '设置返航点',
    'return-to-base': '开启返航',
    'manual-task': '人工任务',
    'pose-adjust': '姿态调整 / 车姿调整',
    'lens-recon': '光电侦察',
    'search-and-shoot': isPatrolVehicle.value ? '巡逻车侦察打击' : '侦察打击',
    'recon-strike': isPatrolVehicle.value ? '巡逻车侦察打击' : '侦察打击',
    '40mm-gun-launch': '40炮打击',
    'at-missile-launch': '红箭13导弹打击',
    '7.62mm-gun-shot': '机枪打击',
    'gun-shot': '机枪打击',
    'rocket-launch': '火箭弹打击',
    'loitering-munition-launch': '巡飞弹打击',
    'laser-illumination': '激光照射',
    'sound-expel': '强声拒止',
    'acoustic-deterrence': '强声拒止',
    'light-expel': '强光拒止',
    'light-deterrence': '强光拒止',
    'em-recon': '电磁侦察',
    'electronic-recon': '电磁侦察',
    'em-assault': '电磁突击',
    'electronic-assault': '电磁突击',
    'em-interference': '电磁干扰',
    'electronic-jamming': '电磁干扰',
    // payload-silent 仅作旧数据兼容
    'payload-silent': '载荷静默',
    'air-recon': '空中侦察',
  };
  return map[normalizedActionType.value] || props.action?.action_type || '未知类型';
});

const vehicleName = computed(() =>
  String(props.vehicleVid || props.action?.vid || '').replace('equipment:', '')
);

const isTargetListStrike = computed(() =>
  ['40mm-gun-launch', 'at-missile-launch', 'rocket-launch', 'loitering-munition-launch']
    .includes(normalizedActionType.value)
);

const isPatrolDeterrence = computed(() =>
  ['sound-expel', 'acoustic-deterrence', 'light-expel', 'light-deterrence'].includes(normalizedActionType.value)
);

const isElectronic = computed(() =>
  ['em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming'].includes(normalizedActionType.value)
);

const showCommonParams = computed(() =>
  ['auto-move', 'follow-move', 'silent-guard', 'manual-task', 'pose-adjust',
   'set-return-point', 'return-to-base',
   'lens-recon', 'recon-strike', 'search-and-shoot', '40mm-gun-launch', 'gun-shot', '7.62mm-gun-shot',
   'at-missile-launch', 'rocket-launch', 'loitering-munition-launch', 'laser-illumination',
   'sound-expel', 'acoustic-deterrence', 'light-expel', 'light-deterrence',
   'em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming',
   // payload-silent 仅作旧数据兼容
   'payload-silent', 'air-recon']
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
  return { lon: 0, lat: 0, alt: 0, radius: -1, type: 1 };
}

function defaultAreaPoint() {
  return { lon: 0, lat: 0, alt: 0 };
}

function defaultDirect() {
  return { type: 1, cent: 9000, sear: 6000, up: 3000, down: -1000, dist: 2000, sens: 0 };
}

function ensureShape() {
  const p = normalizeActionParam(props.action?.param, normalizedActionType.value, props.vehicleType);
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
  loadFusionedTargets();
});

async function loadFusionedTargets() {
  loadingFusioned.value = true;
  try {
    const result = await fetchFusionedTargets(200);
    if (result.ok) {
      fusionedTargets.value = result.data?.items || [];
    }
  } finally {
    loadingFusioned.value = false;
  }
}

// 保留空壳函数以兼容模板中可能存在的引用（已无实际调用）
async function loadRoutes() {
  await loadFusionedTargets();
}
async function loadAreas() {
  await loadFusionedTargets();
}
async function loadTargets() {
  await loadFusionedTargets();
}

function onRouteChange() {
  const route = routeList.value.find((r) => r.resource_id === editedParam.value.route_id);
  if (route && Array.isArray(route.points)) {
    editedParam.value.points = route.points.map((pt) => ({
      lon: pt?.lon ?? 0,
      lat: pt?.lat ?? 0,
      alt: pt?.alt ?? 0,
      radius: pt?.radius ?? -1,
      type: pt?.type ?? 1,
    }));
  }
}

function initFromRouteSelection() {
  // 只有底盘机动类元任务才需要从路线资源初始化 points
  const type = normalizedActionType.value;
  if (type !== 'auto-move') return;
  if (!routeList.value.length) return;

  // 如果 action 自身已经保存了路径点数据，优先使用 action 的数据，
  // 不要用路线资源的 points 覆盖用户手动编辑过的路径点。
  // 例外：若当前 points 全为默认 0，说明尚未真正设置，仍应从路线资源回填。
  if (Array.isArray(editedParam.value.points) && editedParam.value.points.length > 0) {
    // 仅当 route_id 为空时，尝试根据现有 points 匹配路线资源（最佳努力）
    if (!editedParam.value.route_id) {
      const matched = routeList.value.find((r) =>
        Array.isArray(r.points) &&
        r.points.length === editedParam.value.points.length &&
        r.points.every((pt, idx) => {
          const saved = editedParam.value.points[idx];
          return saved && pt.lon === saved.lon && pt.lat === saved.lat;
        })
      );
      editedParam.value.route_id = matched?.resource_id || '';
    }

    const selectedRoute = routeList.value.find((r) => r.resource_id === editedParam.value.route_id);
    if (selectedRoute && Array.isArray(selectedRoute.points) && selectedRoute.points.length > 0) {
      const isDefault = editedParam.value.points.every(
        (pt) => pt && Number(pt.lon) === 0 && Number(pt.lat) === 0
      );
      const same = !isDefault &&
        selectedRoute.points.length === editedParam.value.points.length &&
        selectedRoute.points.every((pt, idx) => {
          const saved = editedParam.value.points[idx];
          return saved && pt.lon === saved.lon && pt.lat === saved.lat;
        });
      if (!same) {
        onRouteChange();
      }
    }
    return;
  }

  // 新建/未设置路线时，默认选中第一条路线
  if (!editedParam.value.route_id) {
    editedParam.value.route_id = routeList.value[0]?.resource_id || '';
  }
  if (editedParam.value.route_id) onRouteChange();
}

function applyAreaFromList() {
  const area = areaList.value.find((a) => a.resource_id === editedParam.value.area_id);
  if (area && Array.isArray(area.points)) {
    editedParam.value.area = area.points.map((pt) => ({
      lon: pt?.lon ?? 0,
      lat: pt?.lat ?? 0,
      alt: pt?.alt ?? 0,
    }));
  }
}

function onAreaChange() {
  applyAreaFromList();
}

function initFromAreaSelection() {
  // 只有需要区域参数的元任务才从区域资源初始化 area
  const type = normalizedActionType.value;
  const needsArea = ['lens-recon', 'search-and-shoot', 'recon-strike', 'em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming', 'sound-expel', 'acoustic-deterrence', 'light-expel', 'light-deterrence'];
  if (!needsArea.includes(type)) return;
  if (!areaList.value.length) return;

  // 如果 action 自身已经保存了区域点数据，优先使用 action 的数据，
  // 不要用区域资源的 points 覆盖用户手动编辑过的区域点。
  // 例外：若当前 area 全为默认 0，说明尚未真正设置，仍应从区域资源回填。
  if (Array.isArray(editedParam.value.area) && editedParam.value.area.length > 0) {
    // 仅当 area_id 为空时，尝试根据当前 area 点匹配区域资源（最佳努力）
    if (!editedParam.value.area_id) {
      const matched = areaList.value.find((a) =>
        Array.isArray(a.points) &&
        a.points.length === editedParam.value.area.length &&
        a.points.every((pt, idx) => {
          const saved = editedParam.value.area[idx];
          return saved && pt.lon === saved.lon && pt.lat === saved.lat;
        })
      );
      editedParam.value.area_id = matched?.resource_id || areaList.value[0]?.resource_id || '';
    }

    const selectedArea = areaList.value.find((a) => a.resource_id === editedParam.value.area_id);
    if (selectedArea && Array.isArray(selectedArea.points) && selectedArea.points.length > 0) {
      const isDefault = editedParam.value.area.every(
        (pt) => pt && Number(pt.lon) === 0 && Number(pt.lat) === 0 && Number(pt.alt) === 0
      );
      // 区域资源真实点数与当前点数不同，或坐标不一致，或当前全为默认值时，
      // 按区域资源重新回填，解决打开弹窗时区域点未加载/数量缺失的问题。
      const sameCount = selectedArea.points.length === editedParam.value.area.length;
      const sameCoords = sameCount &&
        selectedArea.points.every((pt, idx) => {
          const saved = editedParam.value.area[idx];
          return saved && pt.lon === saved.lon && pt.lat === saved.lat && pt.alt === saved.alt;
        });
      if (isDefault || !sameCount || !sameCoords) {
        applyAreaFromList();
      }
    }
    return;
  }

  // 新建/未设置区域时，默认选中第一个区域
  if (!editedParam.value.area_id) {
    editedParam.value.area_id = areaList.value[0]?.resource_id || '';
  }
  if (editedParam.value.area_id) applyAreaFromList();
}

function initFromTargetSelection() {
  if (!Array.isArray(editedParam.value.points) || !targetList.value.length) return;
  editedParam.value.points.forEach((pt) => {
    // 新建/未设置目标时，默认选中第一个目标
    if (!pt.target_ref) {
      pt.target_ref = targetList.value[0]?.resource_id || '';
    }
    if (!pt.target_ref) return;

    // 如果 point 已经有用户手动输入的坐标（非 0），保留用户坐标，
    // 避免每次打开弹窗都用目标资源坐标覆盖。
    const hasUserCoord = Number(pt.lon) !== 0 || Number(pt.lat) !== 0;
    if (hasUserCoord) return;

    const target = targetList.value.find((item) => item.resource_id === pt.target_ref);
    if (target && target.points[0]) {
      const loc = target.points[0];
      pt.lon = Number(loc.lon ?? 0);
      pt.lat = Number(loc.lat ?? 0);
      pt.alt = Number(loc.alt ?? 0);
    }
  });
}

function defaultStrikePoint() {
  return { lon: 0, lat: 0, alt: 0, tart: 0, attr: 0, thr: 0, dam: 0, blk: 0, figt: 0, sug: 0, target_ref: '' };
}

function defaultGunShotPoint() {
  return { lon: 0, lat: 0, alt: 0, tart: 0, target_ref: '' };
}

function defaultAirReconPoint() {
  return {
    lon: 0,
    lat: 0,
    alt: 0,
    type: 0,
    speed: 0,
    camera: 1,
    gimpitch: 36100,
    gimyaw: 36100,
    action: 1,
    playaw: 36100,
    zoom: 0,
    loiter: 0,
  };
}

function addPoint(field) {
  const defaults = { points: defaultAirReconPoint, area: defaultAreaPoint };
  editedParam.value[field].push(defaults[field] ? defaults[field]() : defaultPoint());
}

function removePoint(field, idx) {
  if (editedParam.value[field].length > 1) editedParam.value[field].splice(idx, 1);
}

function addTarget() {
  editedParam.value.points.push(defaultStrikePoint());
}

function addGunShotPoint() {
  editedParam.value.points.push(defaultGunShotPoint());
}

function removeTarget(idx) {
  if (editedParam.value.points.length > 1) editedParam.value.points.splice(idx, 1);
}

function formatCoord(value, digits = 6) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toFixed(digits);
}

function parseCoordInput(value, digits = 6) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return Number(n.toFixed(digits));
}

function onTargetRefChange(idx) {
  const t = editedParam.value.points[idx];
  const target = targetList.value.find((item) => item.resource_id === t.target_ref);
  if (target && target.points[0]) {
    const loc = target.points[0];
    t.lon = Number(loc.lon ?? 0);
    t.lat = Number(loc.lat ?? 0);
    t.alt = Number(loc.alt ?? 0);
  }
}

function addFreq() {
  editedParam.value.frequency.push({ start: 30000000, end: 18000000000 });
}

function removeFreq(idx) {
  editedParam.value.frequency.splice(idx, 1);
}

function isFreqBitSet(bit) {
  const val = Number(editedParam.value.freqtype || 0);
  return ((val >> bit) & 1) === 1;
}

function toggleFreqBit(bit, checked) {
  let val = Number(editedParam.value.freqtype || 0);
  if (checked) {
    val |= 1 << bit;
  } else {
    val &= ~(1 << bit);
  }
  editedParam.value.freqtype = val;
}

function onClose() {
  // 取消时如果已经自动回填过数据，把回填后的参数回传，避免用户只打开看了一眼就下发导致为空
  if (hasAutoFilled.value) {
    finalizeParam();
    const cleaned = JSON.parse(JSON.stringify(editedParam.value));
    if (Array.isArray(cleaned.points)) {
      cleaned.points = cleaned.points.map(({ target_ref, ...rest }) => rest);
    }
    // 电磁侦察/电磁突击/电磁干扰：固定为区域探测（mode=4），数量固定为 1
    if (['em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming'].includes(normalizedActionType.value)) {
      cleaned.mode = 4;
      cleaned.num = 1;
    }
    const serialized = serializeActionParam(cleaned);
    emit('cancel', serialized);
  } else {
    emit('close');
  }
}

const hasAutoFilled = ref(false);

function isZeroPoint(pt) {
  if (!pt || typeof pt !== 'object') return true;
  const lon = Number(pt.lon ?? pt.longitude ?? 0);
  const lat = Number(pt.lat ?? pt.latitude ?? 0);
  return lon === 0 && lat === 0;
}

function isAllZeroPoints(list) {
  return Array.isArray(list) && list.length > 0 && list.every((pt) => isZeroPoint(pt));
}

function fillAreaFromSelection() {
  if (!areaList.value.length) return;
  const id = editedParam.value.area_id || areaList.value[0]?.resource_id || '';
  if (!id) return;
  editedParam.value.area_id = id;
  const area = areaList.value.find((a) => a.resource_id === id);
  if (area && Array.isArray(area.points) && area.points.length > 0) {
    editedParam.value.area = area.points.map((pt) => ({
      lon: Number(pt?.lon ?? pt?.longitude ?? 0),
      lat: Number(pt?.lat ?? pt?.latitude ?? 0),
      alt: Number(pt?.alt ?? pt?.altitude ?? 0),
    }));
    hasAutoFilled.value = true;
  }
}

function fillRouteFromSelection() {
  if (!routeList.value.length) return;
  const id = editedParam.value.route_id || routeList.value[0]?.resource_id || '';
  if (!id) return;
  editedParam.value.route_id = id;
  const route = routeList.value.find((r) => r.resource_id === id);
  if (route && Array.isArray(route.points) && route.points.length > 0) {
    editedParam.value.points = route.points.map((pt) => ({
      lon: Number(pt?.lon ?? pt?.longitude ?? 0),
      lat: Number(pt?.lat ?? pt?.latitude ?? 0),
      alt: Number(pt?.alt ?? pt?.altitude ?? 0),
      radius: Number(pt?.radius ?? -1),
      type: Number(pt?.type ?? 1),
    }));
    hasAutoFilled.value = true;
  }
}

function fillStrikeTargets() {
  if (!targetList.value.length || !Array.isArray(editedParam.value.points)) return;
  editedParam.value.points.forEach((pt) => {
    if (!pt) return;
    if (!pt.target_ref) {
      pt.target_ref = targetList.value[0]?.resource_id || '';
    }
    if (!pt.target_ref) return;
    if (Number(pt.lon) !== 0 || Number(pt.lat) !== 0) return;
    const target = targetList.value.find((item) => item.resource_id === pt.target_ref);
    if (target && target.points && target.points[0]) {
      const loc = target.points[0];
      pt.lon = Number(loc.lon ?? 0);
      pt.lat = Number(loc.lat ?? 0);
      pt.alt = Number(loc.alt ?? 0);
      hasAutoFilled.value = true;
    }
  });
}

function finalizeParam() {
  // 保存前兜底：只要列表数据为空或全 0，就从已选资源回填，
  // 避免异步加载/竞争导致编辑态有值但实际保存的是默认值 0。
  const type = normalizedActionType.value;
  const needsArea = ['lens-recon', 'search-and-shoot', 'recon-strike', 'em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming', 'sound-expel', 'acoustic-deterrence', 'light-expel', 'light-deterrence'];
  if (needsArea.includes(type)) {
    if (!Array.isArray(editedParam.value.area) || editedParam.value.area.length === 0 || isAllZeroPoints(editedParam.value.area)) {
      fillAreaFromSelection();
    }
  }
  if (type === 'auto-move') {
    if (!Array.isArray(editedParam.value.points) || editedParam.value.points.length === 0 || isAllZeroPoints(editedParam.value.points)) {
      fillRouteFromSelection();
    }
  }
  if (['40mm-gun-launch', 'at-missile-launch', 'rocket-launch', 'loitering-munition-launch', 'gun-shot', '7.62mm-gun-shot'].includes(type)) {
    fillStrikeTargets();
    if (Array.isArray(editedParam.value.points)) {
      editedParam.value.num = editedParam.value.points.length;
    }
  }
  // 空中侦察：points 兜底回填
  if (type === 'air-recon') {
    const list = editedParam.value.points;
    if (!Array.isArray(list) || list.length === 0 || isAllZeroPoints(list)) {
      const first = areaList.value[0];
      if (first && Array.isArray(first.points) && first.points.length > 0) {
        editedParam.value.points = first.points.map((pt) => ({
          lon: Number(pt?.lon ?? pt?.longitude ?? 0),
          lat: Number(pt?.lat ?? pt?.latitude ?? 0),
          alt: Number(pt?.alt ?? pt?.altitude ?? 0),
          type: 0,
          speed: 0,
          camera: 1,
          gimpitch: 36100,
          gimyaw: 36100,
          action: 1,
          playaw: 36100,
          zoom: 0,
          loiter: 0,
        }));
        hasAutoFilled.value = true;
      }
    }
  }
}

function onSave() {
  finalizeParam();
  const cleaned = JSON.parse(JSON.stringify(editedParam.value));
  // 清理辅助字段：target_ref 仅用于 UI 选择，不下发
  if (Array.isArray(cleaned.points)) {
    cleaned.points = cleaned.points.map(({ target_ref, ...rest }) => rest);
  }
  // 电磁侦察/电磁突击/电磁干扰：固定为区域探测（mode=4），数量固定为 1
  // 用 sort 区分电磁突击（0）和电磁干扰（1），电磁侦察不传 sort
  if (['em-recon', 'electronic-recon', 'em-assault', 'electronic-assault', 'em-interference', 'electronic-jamming'].includes(normalizedActionType.value)) {
    cleaned.mode = 4;
    cleaned.num = 1;
  }
  if (normalizedActionType.value === 'em-assault' || normalizedActionType.value === 'electronic-assault') {
    cleaned.sort = 0;
  } else if (normalizedActionType.value === 'em-interference' || normalizedActionType.value === 'electronic-jamming') {
    cleaned.sort = 1;
  }
  // 保存前把 UI 字符串格式转换为后端协议数字格式（如断连策略）
  const serialized = serializeActionParam(cleaned);
  emit('save', serialized);
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
  grid-template-columns: 1.2fr 1.2fr 0.9fr 0.9fr 0.9fr auto;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: rgba(226, 246, 248, 0.65);
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.apd-target-table-head {
  grid-template-columns: 1.2fr 1fr 1fr 0.7fr 1fr auto;
}

.apd-route-table-row,
.apd-target-table-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.9fr 0.9fr 0.9fr auto;
  gap: 0.3rem;
  align-items: center;
  padding: 0.25rem 0;
}

.apd-target-table-row {
  grid-template-columns: 1.2fr 1fr 1fr 0.7fr 1fr auto;
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

.apd-air-point {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 222, 200, 0.12);
  border-radius: 6px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.apd-air-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr) auto;
  gap: 0.4rem;
  align-items: end;
}

.apd-air-row + .apd-air-row {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px dashed rgba(0, 222, 200, 0.1);
}

.apd-air-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.apd-air-cell span {
  font-size: 0.68rem;
  color: rgba(226, 246, 248, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apd-air-cell input,
.apd-air-cell select {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.25rem 0.3rem;
  color: #f1feff;
  font-size: 0.78rem;
}

.apd-air-row > .as-btn.mini.danger {
  margin-bottom: 0.05rem;
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

.apd-protect-group {
  background: rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 222, 200, 0.1);
  border-radius: 6px;
  padding: 0.55rem;
  margin-bottom: 0.55rem;
}

.apd-protect-group-title {
  font-size: 0.78rem;
  color: rgba(0, 222, 200, 0.85);
  margin-bottom: 0.4rem;
  font-weight: 600;
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
