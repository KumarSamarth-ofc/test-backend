const transitions = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };
  
  exports.canTransition = (from, to) =>
    transitions[from]?.includes(to);