export const MISSION_TYPE_POINTS = {
    "General": 5,
    "Health/Medical": 10,
    "Environment": 5,
    "Education": 5,
    "Disaster Relief": 10,
  };
  
  export function getBasePointsForType(type) {
    if (!type) return 0;
    return MISSION_TYPE_POINTS[type] ?? 5;
  }
  
  export function updateBasePointsDisplay(selectEl, displayEl) {
    if (!selectEl || !displayEl) return;
    const type = selectEl.value;
    const pts = getBasePointsForType(type);
    displayEl.textContent = type
      ? `Base points for this mission: ${pts}`
      : "Select a type to see base points";
  }