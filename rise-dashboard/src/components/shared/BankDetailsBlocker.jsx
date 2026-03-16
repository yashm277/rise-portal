import { useNavigate } from 'react-router-dom';
import './BankDetailsBlocker.css';

const BankDetailsBlocker = ({ featureName }) => {
  const navigate = useNavigate();

  return (
    <div className="bank-blocker">
      <div className="bank-blocker-icon">
        <i className="fas fa-university"></i>
      </div>
      <h2>Bank Details Required</h2>
      <p>
        You haven't added your bank details yet. Please add your bank details to proceed with{' '}
        <strong>{featureName}</strong>.
      </p>
      <button className="bank-blocker-btn" onClick={() => navigate('/bank-details')}>
        <i className="fas fa-plus-circle"></i>
        Add Bank Details
      </button>
    </div>
  );
};

export default BankDetailsBlocker;
