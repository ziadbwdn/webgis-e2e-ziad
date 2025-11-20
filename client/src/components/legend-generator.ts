import type { StyleConfig } from './layer-style-parser';

/**
 * LegendGenerator - Generates HTML legend based on style configuration
 */
export class LegendGenerator {
  /**
   * Generate legend HTML for a layer based on its style configuration
   * @param layerName - Name of the layer
   * @param styleConfig - Style configuration object
   * @param fallbackColor - Fallback color for generic styles
   * @returns HTML string for the legend
   */
  static generateLegend(
    layerName: string,
    styleConfig: StyleConfig | undefined,
    fallbackColor: string
  ): string {
    if (!styleConfig) {
      // Generic single-color legend
      return `
        <div class="legend-item" style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="width: 20px; height: 12px; background: ${fallbackColor}; border-radius: 2px;"></div>
            <span style="font-weight: 600; font-size: 13px;">${layerName}</span>
          </div>
        </div>
      `;
    }

    switch (styleConfig.styleType) {
      case 'interpolate':
        return this.generateInterpolateLegend(layerName, styleConfig);

      case 'categorical':
        return this.generateCategoricalLegend(layerName, styleConfig);

      case 'simple':
      case 'attributeColor':
        return this.generateSimpleLegend(layerName, styleConfig, fallbackColor);

      default:
        return this.generateSimpleLegend(layerName, styleConfig, fallbackColor);
    }
  }

  /**
   * Generate legend for interpolated styles (gradients)
   */
  private static generateInterpolateLegend(layerName: string, config: any): string {
    const stops = config.stops || [];

    let html = `
      <div class="legend-item" style="margin-bottom: 12px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">${layerName}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${config.attribute}</div>
    `;

    // Show gradient with labeled stops
    stops.forEach((stop: any, index: number) => {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
          <div style="width: 20px; height: 12px; background: ${stop.color}; border-radius: 2px;"></div>
          <span style="font-size: 12px;">${index === 0 ? '≤' : ''}${stop.value.toLocaleString()}</span>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  /**
   * Generate legend for categorical styles
   */
  private static generateCategoricalLegend(layerName: string, config: any): string {
    const categories = config.categories || [];

    let html = `
      <div class="legend-item" style="margin-bottom: 12px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">${layerName}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${config.attribute}</div>
    `;

    categories.forEach((category: any) => {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
          <div style="width: 20px; height: 12px; background: ${category.color}; border-radius: 2px;"></div>
          <span style="font-size: 12px;">${category.value}</span>
        </div>
      `;
    });

    // Add default/other category if exists
    if (config.defaultColor) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; opacity: 0.6;">
          <div style="width: 20px; height: 12px; background: ${config.defaultColor}; border-radius: 2px;"></div>
          <span style="font-size: 12px; font-style: italic;">Unknown</span>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Generate legend for simple styles
   */
  private static generateSimpleLegend(layerName: string, config: any, fallbackColor: string): string {
    const color = config.lineColor || config.fillColor || fallbackColor;

    return `
      <div class="legend-item" style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 12px; background: ${color}; border-radius: 2px;"></div>
          <span style="font-weight: 600; font-size: 13px;">${layerName}</span>
        </div>
        ${config.attribute ? `<div style="font-size: 11px; color: #666; margin-left: 28px; margin-top: 2px;">${config.attribute}</div>` : ''}
      </div>
    `;
  }
}
