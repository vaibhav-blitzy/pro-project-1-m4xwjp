import { UseFormRegister, FieldValues } from "react-hook-form"; // v7.45.0
import { ValidationError } from "yup"; // v1.2.0

/**
 * Enumeration of supported form field types
 */
export enum FormFieldType {
  TEXT = "text",
  EMAIL = "email",
  PASSWORD = "password",
  SELECT = "select",
  TEXTAREA = "textarea",
  CHECKBOX = "checkbox",
  DATE = "date",
  FILE = "file"
}

/**
 * Interface for localized error messages with parameter support
 */
export interface LocalizedMessage {
  key: string;
  params: Record<string, any>;
}

/**
 * Interface for accessibility validation rules
 * Compliant with WCAG 2.1 Level AA requirements
 */
export interface AccessibilityValidation {
  ariaRequired: boolean;
  ariaInvalid: boolean;
  ariaDescribedBy: string;
}

/**
 * Enhanced interface for field validation rules with accessibility support
 */
export interface ValidationRules {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: any) => boolean | string | Promise<boolean | string>;
  errorMessage: LocalizedMessage;
  ariaLabel: string;
  accessibilityRules: AccessibilityValidation;
}

/**
 * Interface for select field options
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Interface for field dependencies
 */
export interface FieldDependency {
  field: string;
  value: any;
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
}

/**
 * Enhanced interface for form field configuration
 * Includes accessibility and dependency support
 */
export interface FormField {
  name: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  validation: ValidationRules;
  options?: SelectOption[];
  ariaLabel: string;
  ariaDescription: string;
  dependencies?: FieldDependency[];
}

/**
 * Type for localized error with context
 */
export interface LocalizedError extends LocalizedMessage {
  context?: string;
  field?: string;
}

/**
 * Enhanced type for form validation errors with localization
 */
export type FormErrors = Record<string, LocalizedError>;

/**
 * Interface for validation context
 */
export interface ValidationContext {
  locale: string;
  timezone: string;
  formContext?: Record<string, any>;
}

/**
 * Enhanced type for form submission handler with validation context
 */
export type FormSubmitHandler = (
  data: any,
  context?: ValidationContext
) => Promise<void>;

/**
 * Type for form field registration with validation
 */
export type FormFieldRegistration = ReturnType<UseFormRegister<FieldValues>>;

/**
 * Type for custom validation result
 */
export type ValidationResult = string | boolean | Promise<string | boolean>;

/**
 * Type for validation error handler
 */
export type ValidationErrorHandler = (error: ValidationError) => LocalizedError;