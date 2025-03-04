// Format date to display in the app
export const formatDate = (date) => {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firestore Timestamp
      date = date.toDate();
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Get today's date in yyyy-mm-dd format for date inputs
  export const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  };
  
  // Convert yyyy-mm-dd to Date object
  export const parseDate = (dateString) => {
    if (!dateString) return null;
    
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };