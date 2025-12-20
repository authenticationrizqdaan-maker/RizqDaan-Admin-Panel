
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { PAKISTAN_LOCATIONS } from '../../constants';
import { auth, googleProvider, db } from '../../firebaseConfig';
import { signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type AuthStep = 'form' | 'otp' | 'google_details';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  onSignup: (userData: Omit<User, 'id' | 'isVerified'> & { referralCodeInput?: string }) => Promise<{ success: boolean; message: string; user?: User }>;
  onVerifyAndLogin: (userId: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignup, onVerifyAndLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<AuthStep>('form');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [googleData, setGoogleData] = useState<{name: string, email: string, googleId: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  
  // Structured Address State
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleGoogleAuth = async () => {
      if (!auth) return;
      try {
          const result = await signInWithPopup(auth, googleProvider);
          const user = result.user;
          
          if(db) {
              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (!userDoc.exists()) {
                  setGoogleData({
                      name: user.displayName || '',
                      email: user.email || '',
                      googleId: user.uid
                  });
                  setInfo('Please complete your vendor profile.');
                  setStep('google_details');
              }
          }
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handlePasswordReset = async () => {
      if (!email) {
          setError("Please enter your email address first.");
          return;
      }
      if (!auth) return;
      try {
          await sendPasswordResetEmail(auth, email);
          setInfo(`Password reset email sent to ${email}`);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp === '123456' && pendingUser) {
      onVerifyAndLogin(pendingUser.id);
    } else {
      setError('Invalid OTP. Please check the code.');
    }
  };

  const clearForm = () => {
    setName(''); setEmail(''); setPhone(''); setShopName(''); 
    setPassword(''); setOtp(''); setError(''); setInfo('');
    setSelectedProvince(''); setSelectedCity(''); setManualAddress('');
    setReferralCodeInput('');
  };

  const handleModeToggle = (mode: 'login' | 'signup') => {
    setIsLogin(mode === 'login');
    setStep('form');
    clearForm();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    const result = await onLogin(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      const msg = result.message.toLowerCase();
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
          setError("Incorrect email or password.");
      } else {
          setError(result.message);
      }
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedProvince || !selectedCity || !manualAddress) {
        setError('Please complete the full Shop Address.');
        return;
    }
    const fullShopAddress = `${manualAddress}, ${selectedCity}, ${selectedProvince}`;

    if (!name || !email || !phone || !shopName || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }

    setIsLoading(true);
    const result = await onSignup({ name, email, phone, shopName, shopAddress: fullShopAddress, password, referralCodeInput });
    setIsLoading(false);

    if (result.success && result.user) {
      setPendingUser(result.user);
      setInfo('Account created! Please verify your number.');
      setStep('otp');
    } else {
      setError(result.message);
    }
  };
  
  const handleGoogleDetailsSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!selectedProvince || !selectedCity || !manualAddress) {
          setError('Please complete the full Shop Address.');
          return;
      }
      const fullShopAddress = `${manualAddress}, ${selectedCity}, ${selectedProvince}`;
      if (!googleData || !phone || !shopName) {
          setError('Please fill in all fields.');
          return;
      }
      setIsLoading(true);
      const result = await onSignup({ ...googleData, phone, shopName, shopAddress: fullShopAddress, password: `google_${googleData.googleId}`, referralCodeInput });
      setIsLoading(false);
      if (result.success && result.user) {
          setPendingUser(result.user);
          setStep('otp');
      } else {
          setError(result.message);
      }
  }
  
  const LocationInputs = () => (
      <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop Location</label>
           <input type="text" value="Pakistan" disabled className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-500 text-sm" />
           <select 
              value={selectedProvince}
              onChange={(e) => { setSelectedProvince(e.target.value); setSelectedCity(''); }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary text-sm"
              required
           >
               <option value="">Select Province</option>
               {Object.keys(PAKISTAN_LOCATIONS).map(prov => <option key={prov} value={prov}>{prov}</option>)}
           </select>
           <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedProvince}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800"
              required
           >
               <option value="">{selectedProvince ? "Select City" : "Select Province First"}</option>
               {selectedProvince && PAKISTAN_LOCATIONS[selectedProvince]?.map(city => <option key={city} value={city}>{city}</option>)}
           </select>
           <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary text-sm"
              placeholder="Shop #, Street, Area / Bazaar"
              required
           />
      </div>
  );

  const renderForm = () => (
    <form onSubmit={isLogin ? handleLoginSubmit : handleSignupSubmit} className="space-y-4">
      {!isLogin && (
        <>
          <InputField id="name" label="Full Name" type="text" value={name} onChange={setName} required />
          <InputField id="phone" label="Phone Number" type="tel" value={phone} onChange={setPhone} required />
          <InputField id="shopName" label="Shop Name" type="text" value={shopName} onChange={setShopName} required />
          <LocationInputs />
        </>
      )}
      <InputField id="email" label="Email Address" type="email" value={email} onChange={setEmail} required />
      <InputField id="password" label="Password" type="password" value={password} onChange={setPassword} required />
      
      {!isLogin && (
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
              <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Referral Code (Optional)</label>
              <input
                type="text"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                placeholder="Enter friend's code to get bonus"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-md shadow-sm outline-none text-sm"
              />
          </div>
      )}

      {isLogin && (
          <div className="flex justify-end">
              <button type="button" onClick={handlePasswordReset} className="text-xs text-primary hover:underline">Forgot Password?</button>
          </div>
      )}

      <button type="submit" className="w-full py-3.5 px-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all flex justify-center" disabled={isLoading}>
        {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up & Earn Bonus')}
      </button>

      {!isLogin && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
              <div className="relative flex justify-center"><span className="px-2 bg-white dark:bg-dark-surface text-sm text-gray-500 dark:text-gray-400">OR</span></div>
            </div>
            <button type="button" onClick={handleGoogleAuth} className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.582-3.344-11.227-7.915l-6.573 4.818C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C39.999 35.596 44 30.165 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
              Sign up with Google
            </button>
          </>
      )}
    </form>
  );

  const renderOtpForm = () => (
    <div className="text-center">
        <h3 className="text-xl font-bold">Verify Your Account</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Enter the 6-digit code sent to your device.</p>
        <form onSubmit={handleOtpSubmit} className="space-y-4 mt-6">
            <InputField id="otp" label="Verification Code" type="text" value={otp} onChange={setOtp} required />
            <button type="submit" className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition-colors">Verify & Login</button>
        </form>
    </div>
  );
  
  const renderGoogleDetailsForm = () => (
      <div>
        <h3 className="text-xl font-bold">Complete Your Registration</h3>
        <form onSubmit={handleGoogleDetailsSubmit} className="space-y-4 mt-6">
            <InputField id="name" label="Full Name" type="text" value={googleData?.name || ''} disabled />
            <InputField id="email" label="Email Address" type="email" value={googleData?.email || ''} disabled />
            <InputField id="phone" label="Phone Number" type="tel" value={phone} onChange={setPhone} required />
            <InputField id="shopName" label="Shop Name" type="text" value={shopName} onChange={setShopName} required />
            <LocationInputs />
            <button type="submit" className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition-colors" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Submit & Verify'}
            </button>
        </form>
      </div>
  );

  const renderContent = () => {
    switch(step) {
      case 'form': return renderForm();
      case 'otp': return renderOtpForm();
      case 'google_details': return renderGoogleDetailsForm();
      default: return renderForm();
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-lg overflow-hidden">
        {step === 'form' && (
          <div className="flex">
            <button onClick={() => handleModeToggle('login')} className={`w-1/2 p-4 text-center font-semibold transition-colors ${isLogin ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>Login</button>
            <button onClick={() => handleModeToggle('signup')} className={`w-1/2 p-4 text-center font-semibold transition-colors ${!isLogin ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>Sign Up</button>
          </div>
        )}
        <div className="p-8">
            {step === 'form' && <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">{isLogin ? 'Welcome Back!' : 'Create Your Vendor Account'}</h2>}
            {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm text-center mb-4">{error}</div>}
            {info && <p className="text-blue-500 text-sm text-center mb-4">{info}</p>}
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

const InputField = ({ id, label, type, value, onChange, required=false, disabled=false }: { id: string, label: string, type: string, value: string, onChange?: (val: string) => void, required?: boolean, disabled?: boolean }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary disabled:bg-gray-100 dark:disabled:bg-gray-800"
      required={required}
      disabled={disabled}
    />
  </div>
);

export default AuthPage;
