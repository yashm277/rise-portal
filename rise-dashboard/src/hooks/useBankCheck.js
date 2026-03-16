import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

const useBankCheck = () => {
  const { user } = useAuth();
  const [bankMissing, setBankMissing] = useState(false);
  const [bankChecking, setBankChecking] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setBankChecking(false);
      return;
    }

    const check = async () => {
      try {
        const response = await apiClient.post('/api/get-bank-details', {
          email: user.email,
          role: user.role,
        });
        if (response.data.success) {
          const d = response.data.data;
          const hasData = !!(
            d.fullAddress || d.accountHolderName || d.accountNumber ||
            d.bankName || d.swiftCode || d.bankBranch || d.specialNumber
          );
          setBankMissing(!hasData);
        }
      } catch {
      } finally {
        setBankChecking(false);
      }
    };

    check();
  }, [user?.email]);

  return { bankMissing, bankChecking };
};

export default useBankCheck;
