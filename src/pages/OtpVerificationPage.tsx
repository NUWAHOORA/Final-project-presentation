import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle2, XCircle, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ucuLogo from '@/assets/ucu-logo.png';
import campusBg from '@/assets/campus-bg.jpg';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;   // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

export default function OtpVerificationPage() {
  const { user, profile, role, verifyOtp, resendOtp, signOut, otpPending, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // OTP digits stored as array
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  // Fallback: code returned directly from Edge Function when email isn't configured
  const [fallbackCode] = useState<string | null>(() => sessionStorage.getItem('otp_fallback_code'));

  // Timers
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);

  // UI state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  // Guard: if no auth or OTP already done, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!otpPending) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, otpPending, navigate]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  // Expiry countdown
  useEffect(() => {
    if (expired || showSuccess || isLocked) return;
    if (expirySeconds <= 0) {
      setExpired(true);
      setVerifyError('Your OTP has expired. Please request a new code.');
      return;
    }
    const id = setTimeout(() => setExpirySeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [expirySeconds, expired, showSuccess, isLocked]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Timer ring progress (0-1)
  const timerProgress = expirySeconds / OTP_EXPIRY_SECONDS;
  const ringColor = timerProgress > 0.4
    ? '#6366f1'
    : timerProgress > 0.15
      ? '#f59e0b'
      : '#ef4444';

  // SVG ring dimensions
  const RING_R = 36;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    // Allow paste of full OTP
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (clean.length > 0) {
        const next = [...Array(OTP_LENGTH).fill('')];
        clean.split('').forEach((ch, i) => { if (i < OTP_LENGTH) next[i] = ch; });
        setDigits(next);
        const focusIdx = Math.min(clean.length, OTP_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setVerifyError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setVerifyError('Please enter all 6 digits.');
      return;
    }
    if (isLocked || expired || showSuccess) return;

    setIsVerifying(true);
    setVerifyError(null);

    const { error } = await verifyOtp(code);

    if (error) {
      setIsVerifying(false);
      setVerifyError(error);

      // Detect lockout from error message
      if (error.toLowerCase().includes('too many')) {
        setIsLocked(true);
        toast.error('Account temporarily locked due to too many failed attempts.');
      } else {
        // Decrement local attempt counter (visual only — real counter is in DB)
        setAttemptsLeft(prev => Math.max(0, prev - 1));
        // Shake the inputs
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } else {
      setIsVerifying(false);
      setShowSuccess(true);
      toast.success('Identity verified! Welcome.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
    }
  }, [digits, isLocked, expired, showSuccess, verifyOtp, navigate]);

  const handleResend = async () => {
    if (resendSeconds > 0 || isResending) return;
    setIsResending(true);
    setVerifyError(null);
    setExpired(false);
    setIsLocked(false);
    setAttemptsLeft(MAX_ATTEMPTS);
    setDigits(Array(OTP_LENGTH).fill(''));
    setExpirySeconds(OTP_EXPIRY_SECONDS);
    setResendSeconds(RESEND_COOLDOWN_SECONDS);

    const { error } = await resendOtp();
    setIsResending(false);

    if (error) {
      toast.error('Failed to resend OTP. Please try again.');
      setVerifyError(error);
    } else {
      toast.success('New verification code sent to your email!');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleBack = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const maskedEmail = user?.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, (_m, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : 'your email';

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background */}
      <img src={campusBg} alt="UCU Campus" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/65" />

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <p className="text-white text-2xl font-bold">Verified!</p>
              <p className="text-white/70 text-sm">Redirecting to your dashboard…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-background/92 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden">

          {/* Top gradient banner */}
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />

          <div className="p-8">
            {/* Logo + heading */}
            <div className="flex flex-col items-center mb-6">
              <img src={ucuLogo} alt="UCU Logo" className="w-28 object-contain mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">Two-Step Verification</h1>
              </div>
              <p className="text-muted-foreground text-sm text-center">
                A 6-digit code was sent to <span className="font-medium text-foreground">{maskedEmail}</span>
              </p>
            </div>

            {/* Timer ring */}
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                  {/* Track */}
                  <circle
                    cx="44" cy="44" r={RING_R}
                    fill="none" stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/30"
                  />
                  {/* Progress */}
                  <motion.circle
                    cx="44" cy="44" r={RING_R}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    animate={{
                      strokeDashoffset: RING_CIRCUMFERENCE * (1 - timerProgress),
                      stroke: ringColor,
                    }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums" style={{ color: ringColor }}>
                    {formatTime(expirySeconds)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">expires</span>
                </div>
              </div>
            </div>

            {/* Fallback code banner — shown when email isn't configured */}
            {fallbackCode && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-center"
              >
                <p className="text-xs font-medium text-amber-600 mb-1">
                  📧 Email not configured — your code is shown below:
                </p>
                <p className="text-3xl font-black tracking-[0.3em] text-amber-500 font-mono">
                  {fallbackCode}
                </p>
                <p className="text-[10px] text-amber-500/70 mt-1">
                  Enter this code in the boxes below
                </p>
              </motion.div>
            )}

            {/* OTP digit inputs */}
            <div className="flex justify-center gap-2 mb-3">
              {digits.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}  /* allow paste */
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  disabled={isLocked || showSuccess || expired}
                  whileFocus={{ scale: 1.08 }}
                  animate={verifyError && !isVerifying ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.35 }}
                  className={`
                    w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background/60
                    focus:outline-none transition-all duration-200 caret-transparent
                    ${digit ? 'border-primary shadow-[0_0_0_3px_rgba(99,102,241,0.15)]' : 'border-muted-foreground/30'}
                    ${verifyError ? 'border-destructive/70' : ''}
                    ${showSuccess ? 'border-emerald-500' : ''}
                    ${isLocked || expired ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                />
              ))}
            </div>

            {/* Attempts left badge */}
            {!isLocked && !expired && !showSuccess && attemptsLeft < MAX_ATTEMPTS && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-3"
              >
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                </span>
              </motion.div>
            )}

            {/* Error message */}
            <AnimatePresence mode="wait">
              {verifyError && !showSuccess && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{verifyError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Locked message */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <Lock className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">
                    Account temporarily locked after too many failed attempts.
                    Click <strong>Resend OTP</strong> to get a fresh code and reset the counter.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verify button */}
            <Button
              id="verify-otp-btn"
              onClick={handleVerify}
              disabled={isVerifying || isLocked || expired || showSuccess || digits.join('').length < OTP_LENGTH}
              className="w-full h-12 mb-4 font-semibold text-white"
              style={{
                background: showSuccess
                  ? 'linear-gradient(135deg,#059669,#10b981)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              }}
            >
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
              ) : showSuccess ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Verified!</>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" /> Verify Code
                </>
              )}
            </Button>

            {/* Resend OTP */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="text-sm text-muted-foreground">Didn't receive the code?</span>
              <button
                id="resend-otp-btn"
                onClick={handleResend}
                disabled={resendSeconds > 0 || isResending || showSuccess}
                className={`
                  flex items-center gap-1 text-sm font-medium transition-colors
                  ${resendSeconds > 0 || isResending
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-primary hover:underline cursor-pointer'}
                `}
              >
                {isResending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : isResending
                    ? 'Sending…'
                    : 'Resend OTP'}
              </button>
            </div>

            {/* Security notice */}
            <div className="rounded-xl bg-muted/40 border border-muted p-3 mb-5">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                🔒 This code is valid for <strong>5 minutes</strong> and can only be used <strong>once</strong>.
                Never share it with anyone.
              </p>
            </div>

            {/* Back to login */}
            <button
              id="back-to-login-btn"
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-white/50 mt-4">
          Smart University Event Management System · Secure Login
        </p>
      </motion.div>
    </div>
  );
}
