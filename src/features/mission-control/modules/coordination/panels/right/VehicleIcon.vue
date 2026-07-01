<template>
  <svg
    :class="['vehicle-icon', `vehicle-icon-${vehicleType}`]"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 火力车 - 炮塔平台 -->
    <template v-if="vehicleType === 'Fire-Support-UGV'">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="58" width="72" height="20" rx="10" stroke-width="2" />
        <circle class="vi-fill" cx="26" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="38" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="50" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="62" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="74" cy="68" r="3" stroke-width="1.5" />
        <rect class="vi-soft" x="22" y="44" width="56" height="16" rx="4" stroke-width="2" />
        <!-- 炮塔 -->
        <path class="vi-soft" d="M34 44 L34 38 Q34 30 50 30 Q66 30 66 38 L66 44 Z" stroke-width="2" />
        <!-- 主炮 -->
        <line x1="58" y1="34" x2="86" y2="22" stroke-width="3" />
        <circle class="vi-fill" cx="50" cy="38" r="3.5" stroke-width="1.4" />
      </g>
    </template>

    <!-- 侦打车 - 侦察+打击 -->
    <template v-else-if="vehicleType === 'Recon-Strike-UGV'">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="58" width="72" height="20" rx="10" stroke-width="2" />
        <circle class="vi-fill" cx="26" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="38" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="50" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="62" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="74" cy="68" r="3" stroke-width="1.5" />
        <rect class="vi-soft" x="22" y="44" width="56" height="16" rx="4" stroke-width="2" />
        <!-- 光电侦察云台 -->
        <line x1="40" y1="44" x2="40" y2="32" stroke-width="2" />
        <circle class="vi-soft" cx="40" cy="28" r="5.5" stroke-width="1.8" />
        <circle class="vi-strong" cx="40" cy="28" r="2" stroke-width="0" />
        <!-- 武器 -->
        <circle class="vi-fill" cx="60" cy="42" r="3.5" stroke-width="1.4" />
        <line x1="62" y1="40" x2="84" y2="30" stroke-width="2.6" />
      </g>
    </template>

    <!-- 巡逻车 - 轻型平台 -->
    <template v-else-if="vehicleType === 'Patrol-UGV'">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="18" y="58" width="64" height="19" rx="9.5" stroke-width="2" />
        <circle class="vi-fill" cx="30" cy="67.5" r="2.8" stroke-width="1.5" />
        <circle class="vi-fill" cx="43" cy="67.5" r="2.8" stroke-width="1.5" />
        <circle class="vi-fill" cx="57" cy="67.5" r="2.8" stroke-width="1.5" />
        <circle class="vi-fill" cx="70" cy="67.5" r="2.8" stroke-width="1.5" />
        <rect class="vi-soft" x="26" y="44" width="48" height="16" rx="4" stroke-width="2" />
        <!-- 观察窗 -->
        <rect x="31" y="47" width="14" height="9" rx="1.5" stroke-width="1.5" opacity="0.7" />
        <!-- 警示灯杆 -->
        <line x1="58" y1="44" x2="58" y2="34" stroke-width="2" />
        <circle class="vi-strong" cx="58" cy="31" r="3.5" stroke-width="1.6" />
        <!-- 警示光弧 -->
        <path d="M64 27 Q68 31 64 35" stroke-width="1.4" opacity="0.55" />
        <path d="M52 27 Q48 31 52 35" stroke-width="1.4" opacity="0.55" />
      </g>
    </template>

    <!-- 电磁车 - 天线阵列 -->
    <template v-else-if="vehicleType === 'Electronic-UGV'">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="58" width="72" height="20" rx="10" stroke-width="2" />
        <circle class="vi-fill" cx="26" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="38" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="50" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="62" cy="68" r="3" stroke-width="1.5" />
        <circle class="vi-fill" cx="74" cy="68" r="3" stroke-width="1.5" />
        <rect class="vi-soft" x="22" y="44" width="56" height="16" rx="4" stroke-width="2" />
        <!-- 天线阵 -->
        <line x1="35" y1="44" x2="31" y2="22" stroke-width="2" />
        <line x1="50" y1="44" x2="50" y2="16" stroke-width="2" />
        <line x1="65" y1="44" x2="69" y2="22" stroke-width="2" />
        <circle class="vi-strong" cx="31" cy="20" r="2" stroke-width="0" />
        <circle class="vi-strong" cx="50" cy="14" r="2" stroke-width="0" />
        <circle class="vi-strong" cx="69" cy="20" r="2" stroke-width="0" />
        <!-- 信号波 -->
        <path d="M54 16 Q60 20 56 27" stroke-width="1.4" opacity="0.5" />
        <path d="M59 12 Q68 19 62 30" stroke-width="1.4" opacity="0.35" />
      </g>
    </template>

    <!-- 空地车 - 四旋翼无人机（俯视） -->
    <template v-else-if="vehicleType === 'Air-Ground-UAV'">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <!-- 机臂 -->
        <line x1="50" y1="50" x2="28" y2="28" stroke-width="2.4" />
        <line x1="50" y1="50" x2="72" y2="28" stroke-width="2.4" />
        <line x1="50" y1="50" x2="28" y2="72" stroke-width="2.4" />
        <line x1="50" y1="50" x2="72" y2="72" stroke-width="2.4" />
        <!-- 旋翼 -->
        <circle class="vi-soft" cx="26" cy="26" r="11" stroke-width="1.8" />
        <circle class="vi-soft" cx="74" cy="26" r="11" stroke-width="1.8" />
        <circle class="vi-soft" cx="26" cy="74" r="11" stroke-width="1.8" />
        <circle class="vi-soft" cx="74" cy="74" r="11" stroke-width="1.8" />
        <circle class="vi-fill" cx="26" cy="26" r="2" stroke-width="0" />
        <circle class="vi-fill" cx="74" cy="26" r="2" stroke-width="0" />
        <circle class="vi-fill" cx="26" cy="74" r="2" stroke-width="0" />
        <circle class="vi-fill" cx="74" cy="74" r="2" stroke-width="0" />
        <!-- 机身 -->
        <circle class="vi-soft" cx="50" cy="50" r="9.5" stroke-width="2" />
        <!-- 云台相机 -->
        <circle class="vi-strong" cx="50" cy="50" r="3.5" stroke-width="0" />
      </g>
    </template>
  </svg>
</template>

<script setup>
defineProps({
  vehicleType: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.vehicle-icon {
  width: 100%;
  height: 100%;
  color: #00dec8;
  display: block;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
  transition: color 0.18s ease, filter 0.18s ease;
}

/* 轮廓内的浅色填充，避免图标过于空旷 */
.vi-soft {
  fill: rgba(0, 222, 200, 0.08);
}

/* 实心强调（镜头 / 信号点 / 相机） */
.vi-strong {
  fill: currentColor;
}

/* 负重轮等小填充 */
.vi-fill {
  fill: rgba(0, 222, 200, 0.16);
}

.vehicle-icon:hover {
  color: #2af5df;
  filter: drop-shadow(0 0 9px rgba(0, 222, 200, 0.55)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}
</style>
