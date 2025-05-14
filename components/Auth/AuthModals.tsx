import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LoginForm } from "./LoginForm";

interface SignupFormProps {
  onSignup: (email: string, password: string | null) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
}

export function SignupForm({
  onSignup,
  onSwitchToLogin,
  isLoading,
}: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [noPassword, setNoPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;

    // Validate email
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    // Validate password (only if noPassword is false)
    if (!noPassword) {
      if (!password.trim()) {
        newErrors.password = "Password is required";
        isValid = false;
      } else if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
        isValid = false;
      }

      // Validate password confirmation
      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
        isValid = false;
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSignup(email, noPassword ? null : password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your.email@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          id="no-password"
          type="checkbox"
          checked={noPassword}
          onChange={() => setNoPassword(!noPassword)}
          disabled={isLoading}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="no-password"
          className="ml-2 block text-sm text-gray-700"
        >
          Create account without password
        </label>
      </div>

      {!noPassword && (
        <>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A479D] hover:bg-[#153A82] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </div>

      <div className="text-sm text-center mt-4">
        <p className="text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-500 font-medium focus:outline-none"
          >
            Sign In
          </button>
        </p>
      </div>
    </form>
  );
}

interface AuthModalsProps {
  showLoginModal: boolean;
  showSignupModal: boolean;
  onCloseLoginModal: () => void;
  onCloseSignupModal: () => void;
  onSwitchToSignup: () => void;
  onSwitchToLogin: () => void;
}

export function AuthModals({
  showLoginModal,
  showSignupModal,
  onCloseLoginModal,
  onCloseSignupModal,
  onSwitchToSignup,
  onSwitchToLogin,
}: AuthModalsProps) {
  const [loginLoading, setLoginLoading] = useState(false);
  const handleLogin = async (email: string, password: string | null) => {
    setLoginLoading(true);
    try {
      // TODO: Implement login logic
    } finally {
      setLoginLoading(false);
      onCloseLoginModal();
    }
  };
  const [signupLoading, setSignupLoading] = useState(false);
  const handleSignup = async (email: string, password: string | null) => {
    setSignupLoading(true);
    try {
      // TODO: Implement signup logic
    } finally {
      setSignupLoading(false);
      onCloseSignupModal();
    }
  };

  return (
    <>
      <Modal
        isOpen={showLoginModal}
        onClose={onCloseLoginModal}
        title="Login to FiNAC"
      >
        <LoginForm
          onLogin={handleLogin}
          onSwitchToSignup={onSwitchToSignup}
          isLoading={loginLoading}
        />
      </Modal>

      <Modal
        isOpen={showSignupModal}
        onClose={onCloseSignupModal}
        title="Create Account"
      >
        <SignupForm
          onSignup={handleSignup}
          onSwitchToLogin={onSwitchToLogin}
          isLoading={signupLoading}
        />
      </Modal>
    </>
  );
}