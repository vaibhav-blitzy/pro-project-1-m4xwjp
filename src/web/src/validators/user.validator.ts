/**
 * @fileoverview User validation schemas and rules implementation using Yup
 * Provides comprehensive validation for user-related forms with accessibility support
 * @version 1.0.0
 */

import { object, string, array } from 'yup'; // v1.2.0
import i18next from 'i18next'; // v23.2.0
import { IUser } from '../interfaces/user.interface';
import { validateEmail, validatePassword } from '../utils/validation.utils';

/**
 * Minimum entropy score required for strong passwords
 */
const MIN_PASSWORD_ENTROPY = 75;

/**
 * Name validation pattern supporting international characters
 * Allows letters, spaces, hyphens and apostrophes from multiple scripts
 */
const NAME_PATTERN = /^[\p{L}\p{M}'\- ]{2,}$/u;

/**
 * Creates an enhanced Yup validation schema for user creation and update
 * with accessibility and internationalization support
 */
export const createUserValidationSchema = () => {
  return object({
    email: string()
      .required(i18next.t('validation.email.required'))
      .test('email', i18next.t('validation.email.invalid'), async (value) => {
        if (!value) return false;
        const result = await validateEmail(value);
        return result.isValid;
      })
      .meta({
        ariaLabel: 'Email input field',
        ariaRequired: true,
        ariaInvalid: false
      }),

    name: string()
      .required(i18next.t('validation.name.required'))
      .min(2, i18next.t('validation.name.tooShort'))
      .max(100, i18next.t('validation.name.tooLong'))
      .matches(NAME_PATTERN, i18next.t('validation.name.invalid'))
      .meta({
        ariaLabel: 'Full name input field',
        ariaRequired: true,
        ariaInvalid: false
      }),

    password: string()
      .required(i18next.t('validation.password.required'))
      .test('password', i18next.t('validation.password.weak'), async (value) => {
        if (!value) return false;
        const result = await validatePassword(value);
        return result.isValid && 
               (result.strengthIndicator === 'strong' || 
                result.strengthIndicator === 'very strong');
      })
      .meta({
        ariaLabel: 'Password input field',
        ariaRequired: true,
        ariaInvalid: false,
        ariaDescribedBy: 'password-requirements'
      }),

    role: string()
      .required(i18next.t('validation.role.required'))
      .oneOf(
        ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'VIEWER'],
        i18next.t('validation.role.invalid')
      )
      .meta({
        ariaLabel: 'User role selection',
        ariaRequired: true,
        ariaInvalid: false
      }),

    preferences: object()
      .required(i18next.t('validation.preferences.required'))
      .shape({
        theme: string().oneOf(['light', 'dark', 'system']),
        language: string().matches(/^[a-z]{2}-[A-Z]{2}$/),
        emailNotifications: string().oneOf(['true', 'false']),
        pushNotifications: string().oneOf(['true', 'false']),
        itemsPerPage: string().matches(/^(10|25|50|100)$/)
      })
      .meta({
        ariaLabel: 'User preferences section',
        ariaRequired: false,
        ariaInvalid: false
      })
  });
};

/**
 * Validates user profile update data with enhanced security and accessibility
 * @param profileData - User profile data to validate
 * @returns Promise<boolean> - Validation result with accessibility feedback
 */
export const validateUserProfile = async (profileData: Partial<IUser>): Promise<boolean> => {
  try {
    const schema = object({
      name: string()
        .required(i18next.t('validation.name.required'))
        .min(2, i18next.t('validation.name.tooShort'))
        .max(100, i18next.t('validation.name.tooLong'))
        .matches(NAME_PATTERN, i18next.t('validation.name.invalid')),

      email: string()
        .required(i18next.t('validation.email.required'))
        .test('email', i18next.t('validation.email.invalid'), async (value) => {
          if (!value) return false;
          const result = await validateEmail(value);
          return result.isValid;
        }),

      preferences: object().shape({
        theme: string().oneOf(['light', 'dark', 'system']),
        language: string().matches(/^[a-z]{2}-[A-Z]{2}$/),
        emailNotifications: string().oneOf(['true', 'false']),
        pushNotifications: string().oneOf(['true', 'false']),
        itemsPerPage: string().matches(/^(10|25|50|100)$/)
      })
    });

    await schema.validate(profileData, { abortEarly: false });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates password change request data with enhanced security features
 * @param passwordData - Password change data to validate
 * @returns Promise<boolean> - Validation result with security indicators
 */
export const validatePasswordChange = async (
  passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }
): Promise<boolean> => {
  try {
    const schema = object({
      currentPassword: string()
        .required(i18next.t('validation.password.currentRequired'))
        .min(12, i18next.t('validation.password.tooShort')),

      newPassword: string()
        .required(i18next.t('validation.password.newRequired'))
        .test('password', i18next.t('validation.password.weak'), async (value) => {
          if (!value) return false;
          const result = await validatePassword(value);
          return result.isValid && 
                 (result.strengthIndicator === 'strong' || 
                  result.strengthIndicator === 'very strong');
        })
        .notOneOf(
          [passwordData.currentPassword],
          i18next.t('validation.password.samePrevious')
        ),

      confirmPassword: string()
        .required(i18next.t('validation.password.confirmRequired'))
        .oneOf(
          [passwordData.newPassword],
          i18next.t('validation.password.noMatch')
        )
    });

    await schema.validate(passwordData, { abortEarly: false });
    return true;
  } catch (error) {
    return false;
  }
};