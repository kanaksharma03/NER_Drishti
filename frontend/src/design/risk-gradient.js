/**
 * Returns the hex color for a given risk severity tier.
 * Never use these colors for general UI elements (buttons, nav, etc).
 * 
 * @param {string} tier - One of 'Low', 'Moderate', 'High', 'Critical'
 * @returns {string} Hex color code
 */
export function getRiskColor(tier) {
  switch (tier?.toLowerCase()) {
    case 'critical':
      return '#B23A3A'; // Immediate danger — deep clay red
    case 'high':
      return '#D9732E'; // Elevated — burnt terracotta
    case 'moderate':
      return '#C9A24B'; // Caution — ochre clay
    case 'low':
      return '#4A7C6F'; // Stable ground — moss/slate teal
    default:
      return '#4A7C6F'; // Default to Low/Stable
  }
}
