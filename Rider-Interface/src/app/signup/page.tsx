"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Truck, ChevronLeft } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { useAuth } from "@/context/AuthContext";

type VehicleType = "motorcycle" | "bicycle";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    vehicleType: "motorcycle",
    vehiclePlate: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push("/home");
    return null;
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim())
      newErrors.lastName = "Last name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email address";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!formData.vehiclePlate.trim())
      newErrors.vehiclePlate = "Vehicle plate number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setIsLoading(true);

    try {
      await register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        vehicle_type: formData.vehicleType,
        vehicle_plate_number: formData.vehiclePlate,
      });
      router.push("/login");
    } catch (err) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full h-12 px-4 text-sm bg-white dark:bg-[#1a1d27] border rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
      errors[field]
        ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500"
        : "border-gray-200 dark:border-[#2a2d37]"
    }`;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0c13]">
      <div className="max-w-[430px] mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/login"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1a1d27] hover:bg-gray-100 dark:hover:bg-[#22252f] transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Account
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Join as a delivery rider
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8 p-4 bg-green-50 dark:bg-green-950/50 rounded-xl border border-green-100 dark:border-green-900">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">
              Rider Delivery
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              Start earning by delivering food
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pb-8">
          {apiError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
              Personal Information
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className={inputClass("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className={inputClass("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 555-000-0000"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={inputClass("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClass("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(value) => updateField("password", value)}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(value) => updateField("confirmPassword", value)}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
              Vehicle Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["motorcycle", "bicycle"] as VehicleType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField("vehicleType", type)}
                      className={`h-12 rounded-xl border-2 text-sm font-medium transition-all ${
                        formData.vehicleType === type
                          ? "border-green-600 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300"
                          : "border-gray-200 dark:border-[#2a2d37] bg-white dark:bg-[#1a1d27] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      {type === "motorcycle" ? "Motorcycle" : "Bicycle"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="vehiclePlate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Plate Number
                </label>
                <input
                  id="vehiclePlate"
                  type="text"
                  placeholder="e.g. MTR-8842"
                  value={formData.vehiclePlate}
                  onChange={(e) => updateField("vehiclePlate", e.target.value.toUpperCase())}
                  className={inputClass("vehiclePlate")}
                />
                {errors.vehiclePlate && (
                  <p className="text-xs text-red-500 mt-1">{errors.vehiclePlate}</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Rider Account"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 -mt-4 pb-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
