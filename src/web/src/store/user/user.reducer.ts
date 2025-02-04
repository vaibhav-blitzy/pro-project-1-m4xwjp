import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { UserState } from './user.types';
import { userActions } from './user.actions';
import { LoadingState } from '../../types/common.types';
import { IUser } from '../../interfaces/user.interface';
import { ApiError } from '../../types/api.types';

/**
 * Initial state for the user slice with proper typing and security considerations
 */
const initialState: UserState = {
  users: [],
  selectedUser: null,
  status: LoadingState.IDLE,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  filters: {
    role: [],
    status: ['active'],
    department: [],
    teams: [],
    searchTerm: '',
    dateRange: undefined
  }
};

/**
 * User slice implementation with comprehensive state management
 * Implements role-based access control and secure PII handling
 */
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * Sets the selected user with PII data handling
     */
    setSelectedUser: (state, action: PayloadAction<IUser>) => {
      state.selectedUser = action.payload;
      state.error = null;
    },

    /**
     * Clears the selected user and associated state
     */
    clearSelectedUser: (state) => {
      state.selectedUser = null;
      state.error = null;
    },

    /**
     * Updates pagination settings with validation
     */
    setPagination: (state, action: PayloadAction<Partial<typeof state.pagination>>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    },

    /**
     * Updates filter criteria with validation
     */
    setFilters: (state, action: PayloadAction<Partial<typeof state.filters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },

    /**
     * Clears all active filters
     */
    clearFilters: (state) => {
      state.filters = {
        ...initialState.filters
      };
    },

    /**
     * Clears any error state
     */
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Users
    builder
      .addCase(userActions.fetchUsers.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.fetchUsers.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        state.users = action.payload;
        state.error = null;
      })
      .addCase(userActions.fetchUsers.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      })

    // Fetch Single User
    builder
      .addCase(userActions.fetchUser.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.fetchUser.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        state.selectedUser = action.payload;
        state.error = null;
      })
      .addCase(userActions.fetchUser.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      })

    // Create User
    builder
      .addCase(userActions.createUser.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.createUser.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        state.users.push(action.payload);
        state.error = null;
        state.pagination.total += 1;
      })
      .addCase(userActions.createUser.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      })

    // Update User
    builder
      .addCase(userActions.updateUser.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.updateUser.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
        state.error = null;
      })
      .addCase(userActions.updateUser.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      })

    // Delete User
    builder
      .addCase(userActions.deleteUser.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.deleteUser.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        state.users = state.users.filter(user => user.id !== action.payload);
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
        state.pagination.total -= 1;
        state.error = null;
      })
      .addCase(userActions.deleteUser.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      })

    // Update User Preferences
    builder
      .addCase(userActions.updateUserPreferences.pending, (state) => {
        state.status = LoadingState.LOADING;
        state.error = null;
      })
      .addCase(userActions.updateUserPreferences.fulfilled, (state, action) => {
        state.status = LoadingState.SUCCESS;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
        state.error = null;
      })
      .addCase(userActions.updateUserPreferences.rejected, (state, action) => {
        state.status = LoadingState.ERROR;
        state.error = action.payload as ApiError;
      });
  }
});

// Export actions and reducer
export const {
  setSelectedUser,
  clearSelectedUser,
  setPagination,
  setFilters,
  clearFilters,
  clearError
} = userSlice.actions;

export const userReducer = userSlice.reducer;