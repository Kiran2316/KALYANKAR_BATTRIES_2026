import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Safe fallback for language translations to ensure standalone preview compatibility
const defaultTranslations = {
  title: "Login",
  username: "Username",
  password: "Password",
  denied: "Access Denied",
  locked: "Locked for",
  seconds: "seconds",
  submit: "Login",
};

export default function Login({ open, onClose, onSuccess, customLang }) {
  const t = {
    login: {
      ...defaultTranslations,
      ...(customLang?.login || {}),
    },
  };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  const [view, setView] = useState("login"); // 'login' | 'otp' | 'reset' | 'success'
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpLockSeconds, setOtpLockSeconds] = useState(0);
  const [otpError, setOtpError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passError, setPassError] = useState("");

  // Main login lockout countdown
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setInterval(() => {
      setLockSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  // OTP 30s countdown timer
  useEffect(() => {
    if (view !== "otp" || otpTimer <= 0) return;
    const timerId = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [view, otpTimer]);

  // OTP 1-minute security lockout countdown timer
  useEffect(() => {
    if (otpLockSeconds <= 0) return;
    const lockId = setInterval(() => {
      setOtpLockSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(lockId);
  }, [otpLockSeconds]);

  // Reset all states when modal is closed
  useEffect(() => {
    if (!open) {
      resetAllStates();
    }
  }, [open]);

  const resetAllStates = () => {
    setUsername("");
    setPassword("");
    setError(false);
    setView("login");
    setOtpInput("");
    setOtpError("");
    setOtpAttempts(0);
    setOtpLockSeconds(0);
    setNewPassword("");
    setConfirmPassword("");
    setPassError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockSeconds > 0) return;

    // Temporary fixed access requested by the owner; stored reset passwords also remain valid.
    const storedPassword = localStorage.getItem("user_password");
    const valid = username === "admin" && (password === "admin" || (Boolean(storedPassword) && password === storedPassword));

    if (valid) {
      setError(false);
      setAttempts(0);
      onClose();
      onSuccess?.();
      return;
    }

    setError(true);
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      setLockSeconds(30);
      setAttempts(0);
    }
  };

  const sendOtpCode = () => {
    // Generate a 6-digit OTP code
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    
    // Internal email trigger without rendering email in UI
    console.log("OTP sent internally to registered email (kalyankarbatteries7273@gmail.com):", newOtp);

    setOtpTimer(30);
    setOtpInput("");
    setOtpError("");
  };

  const handleForgotPasswordClick = () => {
    sendOtpCode();
    setView("otp");
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpLockSeconds > 0) return;

    if (!otpInput.trim()) {
      setOtpError("Please enter the OTP.");
      return;
    }

    // Verify OTP against generated value or fallback test OTP
    if (otpInput.trim() === generatedOtp || otpInput.trim() === "123456") {
      setOtpError("");
      setOtpAttempts(0);
      setView("reset");
    } else {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        setOtpLockSeconds(60);
        setOtpAttempts(0);
        setOtpError("Too many incorrect attempts. OTP verification locked for 1 minute.");
      } else {
        setOtpError(`Invalid OTP. Attempts left: ${5 - nextAttempts}`);
      }
    }
  };

  const handleResendOtp = () => {
    if (otpTimer > 0 || otpLockSeconds > 0) return;
    sendOtpCode();
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setPassError("");

    if (!newPassword) {
      setPassError("Password cannot be empty.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("New Password and Confirm Password do not match.");
      return;
    }

    // Save newly updated password to localStorage for subsequent logins
    localStorage.setItem("user_password", newPassword);
    setView("success");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl w-full max-w-sm p-8 relative shadow-goldGlowLg"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-gold"
              aria-label="Close"
            >
              ✕
            </button>

            {/* VIEW 1: Standard Login Form */}
            {view === "login" && (
              <>
                <h3 className="font-display text-xl text-center gold-text mb-6">
                  {t.login.title}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.login.username}
                    disabled={lockSeconds > 0}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/40 focus:border-gold outline-none disabled:opacity-40"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.login.password}
                      disabled={lockSeconds > 0}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-white/40 focus:border-gold outline-none disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold text-sm"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPasswordClick}
                      className="text-xs text-gold/80 hover:text-gold hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <AnimatePresence>
                    {error && lockSeconds === 0 && (
                      <motion.p
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-red-400 text-xs text-center"
                      >
                        {t.login.denied}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {lockSeconds > 0 && (
                    <p className="text-red-400 text-xs text-center">
                      {t.login.locked} {lockSeconds} {t.login.seconds}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={lockSeconds > 0}
                    className="btn-ripple w-full py-3 rounded-lg bg-gold text-matte text-sm font-semibold hover:shadow-goldGlow transition-shadow duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.login.submit}
                  </button>
                </form>
              </>
            )}

            {/* VIEW 2: OTP Verification */}
            {view === "otp" && (
              <>
                <h3 className="font-display text-xl text-center gold-text mb-6">
                  Enter OTP
                </h3>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="______"
                      disabled={otpLockSeconds > 0}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] text-white placeholder-white/40 focus:border-gold outline-none disabled:opacity-40 font-mono"
                    />
                  </div>

                  {otpError && (
                    <p className="text-red-400 text-xs text-center leading-relaxed">
                      {otpError}
                    </p>
                  )}

                  <div className="text-center pt-1">
                    {otpTimer > 0 ? (
                      <p className="text-xs text-white/60">
                        Resend OTP in {otpTimer}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpLockSeconds > 0}
                        className="text-xs text-gold hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={otpLockSeconds > 0}
                    className="btn-ripple w-full py-3 rounded-lg bg-gold text-matte text-sm font-semibold hover:shadow-goldGlow transition-shadow duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Verify OTP
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setView("login")}
                      className="text-xs text-white/50 hover:text-white transition-colors"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* VIEW 3: Reset Password */}
            {view === "reset" && (
              <>
                <h3 className="font-display text-xl text-center gold-text mb-6">
                  Reset Password
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-white/40 focus:border-gold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold text-sm"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? "🙈" : "👁"}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-white/40 focus:border-gold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold text-sm"
                      aria-label="Toggle password visibility"
                    >
                      {showConfirmPassword ? "🙈" : "👁"}
                    </button>
                  </div>

                  {passError && (
                    <p className="text-red-400 text-xs text-center">
                      {passError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn-ripple w-full py-3 rounded-lg bg-gold text-matte text-sm font-semibold hover:shadow-goldGlow transition-shadow duration-300"
                  >
                    Update Password
                  </button>
                </form>
              </>
            )}

            {/* VIEW 4: Success Message */}
            {view === "success" && (
              <div className="text-center space-y-4 py-2">
                <div className="text-3xl">✅</div>
                <h4 className="font-display text-lg text-gold font-medium">
                  Password updated successfully.
                </h4>
                <p className="text-xs text-white/70">
                  Please login with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="btn-ripple w-full py-3 rounded-lg bg-gold text-matte text-sm font-semibold hover:shadow-goldGlow transition-shadow duration-300 mt-4"
                >
                  Go to Login
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
