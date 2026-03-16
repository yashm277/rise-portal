import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import axios from 'axios';
import './BankDetails.css';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const COUNTRY_OPTIONS = ['UK', 'India', 'US and Others'];

const COUNTRY_TO_TYPE = {
  'UK': 'IBAN',
  'India': 'PAN',
  'US and Others': 'Routing',
};

const TYPE_TO_COUNTRY = {
  'IBAN': 'UK',
  'PAN': 'India',
  'Routing': 'US and Others',
};

const SPECIAL_NUMBER_LABEL = {
  'UK': 'IBAN Number',
  'India': 'PAN Number',
  'US and Others': 'Routing Number',
};

const SPECIAL_NUMBER_REGEX = {
  'UK': /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/,
  'India': /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  'US and Others': /^[0-9]{9}$/,
};

const validateSpecialNumber = (country, value) => {
  if (!value || !country) return null;
  const regex = SPECIAL_NUMBER_REGEX[country];
  if (!regex) return null;
  return regex.test(value) ? null : `Please enter a correct ${SPECIAL_NUMBER_LABEL[country]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const isWithin30Days = (lastUpdate) => {
  if (!lastUpdate) return false;
  const last = new Date(lastUpdate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  return diffDays < 90;
};

const hasExistingData = (data) =>
  !!(data.fullAddress || data.accountHolderName || data.accountNumber ||
     data.bankName || data.swiftCode || data.bankBranch || data.specialNumber);

const EMPTY_FORM = {
  fullAddress: '',
  accountHolderName: '',
  accountNumber: '',
  bankName: '',
  swiftCode: '',
  bankBranch: '',
  specialNumber: '',
};

const ConfirmPopup = ({ formData, selectedCountry, onConfirm, onCancel, saving }) => {
  const typeLabel = SPECIAL_NUMBER_LABEL[selectedCountry] || 'Special Number';
  const rows = [
    { label: 'Full Address', value: formData.fullAddress },
    { label: 'Account Holder Name', value: formData.accountHolderName },
    { label: 'Account Number', value: formData.accountNumber },
    { label: 'Bank Name', value: formData.bankName },
    { label: 'SWIFT Code', value: formData.swiftCode },
    { label: 'Bank Branch', value: formData.bankBranch },
    { label: 'Country', value: selectedCountry },
    { label: typeLabel, value: formData.specialNumber },
  ];

  return (
    <div className="bd-overlay">
      <div className="bd-popup">
        <div className="bd-popup-header">
          <h3>Confirm Bank Details</h3>
          <p className="bd-popup-subtitle">Please review your details before saving. You won't be able to update again for 3 months.</p>
        </div>
        <div className="bd-popup-rows">
          {rows.map(({ label, value }) => (
            <div className="bd-popup-row" key={label}>
              <span className="bd-popup-label">{label}</span>
              <span className="bd-popup-value">{value || '—'}</span>
            </div>
          ))}
        </div>
        <div className="bd-popup-actions">
          <button type="button" className="bd-btn-cancel" onClick={onCancel} disabled={saving}>
            Go Back & Edit
          </button>
          <button type="button" className="bd-btn-confirm" onClick={onConfirm} disabled={saving}>
            {saving ? 'Saving...' : 'Yes, Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BankDetails = () => {
  const { user } = useAuth();
  const isMentor = user?.role === 'Mentor' || user?.role === 'Writing Coach';

  const [fetchedData, setFetchedData] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [specialNumberError, setSpecialNumberError] = useState(null);

  useEffect(() => {
    if (user?.email && isMentor) {
      fetchBankDetails();
    } else if (!isMentor) {
      setLoading(false);
    }
  }, [user]);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post('/api/get-bank-details', {
        email: user.email,
        role: user.role,
      });
      if (response.data.success) {
        const d = response.data.data;
        setFetchedData(d);
        setFormData({
          fullAddress: d.fullAddress,
          accountHolderName: d.accountHolderName,
          accountNumber: d.accountNumber,
          bankName: d.bankName,
          swiftCode: d.swiftCode,
          bankBranch: d.bankBranch,
          specialNumber: d.specialNumber,
        });
        setSelectedCountry(TYPE_TO_COUNTRY[d.specialNumberType] || '');
        if (!hasExistingData(d)) {
          setIsEditing(true);
        }
      } else {
        setError(response.data.message || 'Failed to load bank details.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bank details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'specialNumber') {
      setSpecialNumberError(validateSpecialNumber(selectedCountry, value));
    }
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setFormData(prev => ({ ...prev, specialNumber: '' }));
    setSpecialNumberError(null);
  };

  const handleEditClick = () => {
    setSaveError(null);
    setSaveSuccess(false);
    setSpecialNumberError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (fetchedData) {
      setFormData({
        fullAddress: fetchedData.fullAddress,
        accountHolderName: fetchedData.accountHolderName,
        accountNumber: fetchedData.accountNumber,
        bankName: fetchedData.bankName,
        swiftCode: fetchedData.swiftCode,
        bankBranch: fetchedData.bankBranch,
        specialNumber: fetchedData.specialNumber,
      });
      setSelectedCountry(TYPE_TO_COUNTRY[fetchedData.specialNumberType] || '');
    }
    setSaveError(null);
    setSpecialNumberError(null);
    setIsEditing(false);
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    setSaveError(null);

    const missing = [];
    if (!formData.fullAddress.trim()) missing.push('Full Address');
    if (!formData.accountHolderName.trim()) missing.push('Account Holder Name');
    if (!formData.accountNumber.trim()) missing.push('Account Number');
    if (!formData.bankName.trim()) missing.push('Bank Name');
    if (!formData.swiftCode.trim()) missing.push('SWIFT Code');
    if (!formData.bankBranch.trim()) missing.push('Bank Branch');
    if (!selectedCountry) missing.push('Country');
    if (!formData.specialNumber.trim()) missing.push(SPECIAL_NUMBER_LABEL[selectedCountry] || 'Special Number');

    if (missing.length > 0) {
      setSaveError(`Please fill in all required fields: ${missing.join(', ')}.`);
      return;
    }

    const numError = validateSpecialNumber(selectedCountry, formData.specialNumber);
    if (numError) {
      setSpecialNumberError(numError);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    try {
      setSaveLoading(true);
      setSaveError(null);
      const response = await apiClient.post('/api/update-bank-details', {
        email: user.email,
        role: user.role,
        ...formData,
        specialNumberType: COUNTRY_TO_TYPE[selectedCountry] || '',
      });
      if (response.data.success) {
        setShowConfirm(false);
        setSaveSuccess(true);
        setIsEditing(false);
        const today = new Date().toISOString().split('T')[0];
        setFetchedData(prev => ({
          ...prev,
          ...formData,
          specialNumberType: COUNTRY_TO_TYPE[selectedCountry] || '',
          lastBankUpdate: today,
        }));
      } else {
        setShowConfirm(false);
        setSaveError(response.data.message || 'Failed to save bank details.');
      }
    } catch (err) {
      setShowConfirm(false);
      setSaveError(err.response?.data?.message || 'Failed to save bank details. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const locked = fetchedData ? isWithin30Days(fetchedData.lastBankUpdate) : false;
  const hasData = fetchedData ? hasExistingData(fetchedData) : false;

  if (!isMentor) {
    return (
      <div className="bd-layout">
        <Sidebar />
        <div className="bd-content">
          <header className="bd-header">
            <div>
              <h1 className="page-title">Bank Details</h1>
              <p className="page-subtitle">View and update your payment information</p>
            </div>
          </header>
          <div className="bd-body">
            <div className="bd-card">
              <div className="bd-state-box">
                <p>You do not have permission to access this page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-layout">
      <Sidebar />
      <div className="bd-content">
        <header className="bd-header">
          <div>
            <h1 className="page-title">Bank Details</h1>
            <p className="page-subtitle">View and update your payment information</p>
          </div>
        </header>

        <div className="bd-body">
          <div className="bd-card">
            <div className="bd-card-header">
              <h2 className="bd-card-title">Payment Information</h2>
              {!loading && !error && hasData && !isEditing && !locked && (
                <button className="bd-edit-btn" onClick={handleEditClick}>
                  Edit Details
                </button>
              )}
            </div>

            {loading ? (
              <div className="bd-state-box">
                <div className="loading-spinner"></div>
                <p>Loading your bank details...</p>
              </div>
            ) : error ? (
              <div className="bd-state-box bd-error-box">
                <p>{error}</p>
                <button className="btn-refresh" onClick={fetchBankDetails}>Try Again</button>
              </div>
            ) : (
              <>
                {fetchedData?.lastBankUpdate && (
                  <div className={`bd-update-bar ${locked ? 'bd-update-bar--locked' : ''}`}>
                    <span>Last updated: <strong>{formatDate(fetchedData.lastBankUpdate)}</strong></span>
                    {locked && (
                      <span className="bd-lock-msg">
                        Please wait, you have already updated your bank details in the last 3 months. For immediate support contact admin.
                      </span>
                    )}
                  </div>
                )}

                {locked && hasData ? (
                  <div className="bd-readonly-grid">
                    <ReadRow label="Full Address" value={fetchedData.fullAddress} wide />
                    <ReadRow label="Account Holder Name" value={fetchedData.accountHolderName} />
                    <ReadRow label="Account Number" value={fetchedData.accountNumber} />
                    <ReadRow label="Bank Name" value={fetchedData.bankName} />
                    <ReadRow label="SWIFT Code" value={fetchedData.swiftCode} />
                    <ReadRow label="Bank Branch" value={fetchedData.bankBranch} />
                    <ReadRow label="Country" value={TYPE_TO_COUNTRY[fetchedData.specialNumberType] || '—'} />
                    <ReadRow
                      label={SPECIAL_NUMBER_LABEL[TYPE_TO_COUNTRY[fetchedData.specialNumberType]] || 'Special Number'}
                      value={fetchedData.specialNumber}
                    />
                  </div>
                ) : (
                  <form className="bd-form" onSubmit={handleSubmitClick}>

                    <div className="bd-form-group">
                      <label htmlFor="fullAddress">Full Address <span className="bd-required">*</span></label>
                      <textarea
                        id="fullAddress"
                        value={formData.fullAddress}
                        onChange={(e) => handleChange('fullAddress', e.target.value)}
                        placeholder="Enter your full address..."
                        rows={3}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="bd-form-row">
                      <div className="bd-form-group">
                        <label htmlFor="accountHolderName">Account Holder Name <span className="bd-required">*</span></label>
                        <input
                          id="accountHolderName"
                          type="text"
                          value={formData.accountHolderName}
                          onChange={(e) => handleChange('accountHolderName', e.target.value)}
                          placeholder="Name on the bank account"
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="bd-form-group">
                        <label htmlFor="accountNumber">Account Number <span className="bd-required">*</span></label>
                        <input
                          id="accountNumber"
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => handleChange('accountNumber', e.target.value)}
                          placeholder="Bank account number"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="bd-form-row">
                      <div className="bd-form-group">
                        <label htmlFor="bankName">Bank Name <span className="bd-required">*</span></label>
                        <input
                          id="bankName"
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => handleChange('bankName', e.target.value)}
                          placeholder="e.g. HSBC, SBI, Chase"
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="bd-form-group">
                        <label htmlFor="swiftCode">SWIFT Code <span className="bd-required">*</span></label>
                        <input
                          id="swiftCode"
                          type="text"
                          value={formData.swiftCode}
                          onChange={(e) => handleChange('swiftCode', e.target.value)}
                          placeholder="e.g. HBUKGB4B"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="bd-form-group bd-form-group--half">
                      <label htmlFor="bankBranch">Bank Branch <span className="bd-required">*</span></label>
                      <input
                        id="bankBranch"
                        type="text"
                        value={formData.bankBranch}
                        onChange={(e) => handleChange('bankBranch', e.target.value)}
                        placeholder="Branch name or code"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="bd-form-group">
                      <label>Which country is the account based in? <span className="bd-required">*</span></label>
                      <div className="bd-radio-group">
                        {COUNTRY_OPTIONS.map((country) => (
                          <label
                            key={country}
                            className={`bd-radio-option ${selectedCountry === country ? 'selected' : ''} ${!isEditing ? 'disabled' : ''}`}
                          >
                            <input
                              type="radio"
                              name="country"
                              value={country}
                              checked={selectedCountry === country}
                              onChange={() => handleCountryChange(country)}
                              disabled={!isEditing}
                            />
                            <span>{country}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {selectedCountry && (
                      <div className="bd-form-group bd-form-group--half">
                        <label htmlFor="specialNumber">
                          {SPECIAL_NUMBER_LABEL[selectedCountry]} <span className="bd-required">*</span>
                        </label>
                        <input
                          id="specialNumber"
                          type="text"
                          value={formData.specialNumber}
                          onChange={(e) => handleChange('specialNumber', e.target.value.toUpperCase())}
                          placeholder={`Enter ${SPECIAL_NUMBER_LABEL[selectedCountry]}`}
                          disabled={!isEditing}
                          className={specialNumberError ? 'bd-input-error' : ''}
                        />
                        {specialNumberError && (
                          <span className="bd-field-error">{specialNumberError}</span>
                        )}
                      </div>
                    )}

                    {saveError && (
                      <div className="bd-form-error">{saveError}</div>
                    )}
                    {saveSuccess && (
                      <div className="bd-form-success">Bank details saved successfully!</div>
                    )}

                    {isEditing && (
                      <div className="bd-form-actions">
                        {hasData && (
                          <button type="button" className="bd-btn-cancel" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        )}
                        <button type="submit" className="bd-submit-btn">
                          Review & Save
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
          formData={formData}
          selectedCountry={selectedCountry}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
          saving={saveLoading}
        />
      )}
    </div>
  );
};

const ReadRow = ({ label, value, wide }) => (
  <div className={`bd-read-row ${wide ? 'bd-read-row--wide' : ''}`}>
    <span className="bd-read-label">{label}</span>
    <span className="bd-read-value">{value || '—'}</span>
  </div>
);

export default BankDetails;
