const transitions = {
    APPLIED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['SCRIPT', 'WORK', 'CANCELLED'],
    SCRIPT: ['WORK', 'COMPLETED', 'CANCELLED'],
    WORK: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };
  
  exports.canTransition = (from, to) =>
    transitions[from]?.includes(to);