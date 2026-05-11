"use client";

/**
 * Liquid Glass SVG 滤镜定义。
 * 通过 backdrop-filter: url(#glass-lg) 引用,Chrome/Edge 支持完整折射。
 * Safari/Firefox 不支持 SVG 滤镜在 backdrop-filter 里,但 blur + saturate 会作为 fallback 生效。
 *
 * displacement map:位移图(R 通道 = X 位移,G 通道 = Y 位移),128 = 中性。
 * 这里用一个轻量的径向梯度 SVG,而不是 hengo 那个 base64 WebP,
 * 因为 CGT 是平面工具,不需要 hengo 那种深度折射,只要轻微扰动即可。
 */
export default function LiquidGlassFilters() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        {/* 大面板用 — 卡片、表格、对话框 */}
        <filter id="glass-lg" primitiveUnits="objectBoundingBox">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.012" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="3"
            specularConstant="0.4"
            specularExponent="60"
            lightingColor="#ffffff"
            result="spec"
          >
            <feDistantLight azimuth="225" elevation="60" />
          </feSpecularLighting>
          <feComposite
            in="spec"
            in2="SourceGraphic"
            operator="in"
            result="specMasked"
          />
          <feComposite
            in="specMasked"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
          />
        </filter>

        {/* 小元件用 — 按钮、徽章、提示 */}
        <filter id="glass-sm" primitiveUnits="objectBoundingBox">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.006" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="2"
            specularConstant="0.3"
            specularExponent="40"
            lightingColor="#ffffff"
            result="spec"
          >
            <feDistantLight azimuth="225" elevation="60" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceGraphic" operator="in" result="specMasked" />
          <feComposite
            in="specMasked"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
          />
        </filter>
      </defs>
    </svg>
  );
}
