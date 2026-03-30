import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Shield, X } from 'lucide-react';

const ParentalPIN = ({ isOpen, onClose, onSuccess, mode = 'verify' }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(mode === 'setup');
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const confirmInputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setError('');
      inputRefs[0]?.current?.focus();
    }
  }, [isOpen]);

  const handlePinChange = (index, value, isConfirm = false) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const setter = isConfirm ? setConfirmPin : setPin;
    const currentPin = isConfirm ? confirmPin : pin;

    if (value.length > 1) return;
    if (value && !/^[0-9]$/.test(value)) return;

    const newPin = [...currentPin];
    newPin[index] = value;
    setter(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const setter = isConfirm ? setConfirmPin : setPin;
    const currentPin = isConfirm ? confirmPin : pin;

    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const handleSubmit = () => {
    const enteredPin = pin.join('');
    
    if (enteredPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    if (isSettingUp) {
      const confirmedPin = confirmPin.join('');
      if (confirmedPin.length !== 4) {
        setError('Please confirm your PIN');
        return;
      }
      if (enteredPin !== confirmedPin) {
        setError('PINs do not match');
        return;
      }
      // Save PIN to localStorage
      localStorage.setItem('parental_pin', enteredPin);
      onSuccess();
    } else {
      // Verify PIN
      const savedPin = localStorage.getItem('parental_pin');
      if (enteredPin === savedPin) {
        onSuccess();
      } else {
        setError('Incorrect PIN');
        setPin(['', '', '', '']);
        inputRefs[0]?.current?.focus();
      }
    }
  };

  const renderPinInputs = (pinArray, setPinArray, refs, label, isConfirm = false) => (
    <div className="mb-6">
      <label className="block text-white/80 text-sm mb-2">{label}</label>
      <div className="flex gap-3 justify-center">
        {pinArray.map((digit, index) => (
          <input
            key={index}
            ref={refs[index]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
            onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
            className="w-14 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-white/20 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-900 to-black border-purple-500/30">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSettingUp ? 'Set Parental Control PIN' : 'Enter Parental PIN'}
            </h2>
            <p className="text-white/60 text-sm">
              {isSettingUp 
                ? 'Create a 4-digit PIN to restrict mature content' 
                : 'Enter your PIN to access mature content'}
            </p>
          </div>

          {renderPinInputs(pin, setPin, inputRefs, isSettingUp ? 'Create PIN' : 'Enter PIN')}
          
          {isSettingUp && renderPinInputs(confirmPin, setConfirmPin, confirmInputRefs, 'Confirm PIN', true)}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {isSettingUp ? 'Set PIN' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentalPIN;