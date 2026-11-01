
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const sortFlats = (a, b) => {
  const getUnit = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.unit_number || item.unit || item.flat_number || '';
  };
  const unitA = getUnit(a);
  const unitB = getUnit(b);
  return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: 'base' });
};
