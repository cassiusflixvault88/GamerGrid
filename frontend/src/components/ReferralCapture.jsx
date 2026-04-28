import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Captures `?ref=CODE` from any URL and stores it in localStorage so the
 * AuthContext can claim it after the visitor signs up.
 */
const ReferralCapture = () => {
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const code = params.get('ref');
      if (code && code.length >= 4 && code.length <= 12) {
        localStorage.setItem('gg_ref_code', code.toUpperCase());
      }
    } catch { /* silent */ }
  }, [location.search]);
  return null;
};

export default ReferralCapture;
