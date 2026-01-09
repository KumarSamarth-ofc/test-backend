// Application phase transition rules
const transitions = {
  APPLIED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["SCRIPT", "WORK", "CANCELLED"],
  SCRIPT: ["WORK", "COMPLETED", "CANCELLED"],
  WORK: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// Check if transition from one phase to another is allowed
exports.canTransition = (from, to) => transitions[from]?.includes(to);
