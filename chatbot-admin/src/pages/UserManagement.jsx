import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, RefreshCw, Save, UserPlus } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const emptyForm = {
  uid: '',
  name: '',
  email: '',
  password: '',
  contact_number: '',
  role: '',
  is_active: true,
};

// Page-access + feature permissions — keys map to Role table columns
// Order: Pages first, then Features
const permissionLabels = {
  can_access_dashboard: 'Dashboard',
  can_view_all_chats: 'Chat History',
  can_access_train_ai: 'Train AI',
  can_access_token_usage: 'Token Usage & Billing',
  can_access_scheduler: 'Scheduler',
  can_manage_users: 'User Management',
  can_access_license_management: 'License Management',
  can_download: 'Download CSV',
};

function getErrorMessage(error) {
  return error?.response?.data?.error || 'Something went wrong';
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [error, setError] = useState('');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/api/users');
      return data;
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/api/roles');
      return data;
    },
  });

  const roles = rolesData?.data || [];
  const users = usersData?.data || [];

  // Only super admin can assign super_admin or admin roles
  const roleOptions = useMemo(
    () =>
      roles
        .map((role) => role.role_name)
        .filter((roleName) => isSuperAdmin || (roleName !== 'super_admin' && roleName !== 'admin')),
    [roles, isSuperAdmin]
  );
  const selectedRole = roles.find((role) => role.role_name === form.role);

  const saveUser = useMutation({
    mutationFn: async (payload) => {
      const body = { ...payload };
      if (!body.password) delete body.password;
      if (body.uid) {
        const { uid, ...updateBody } = body;
        const { data } = await api.put(`/api/users/${uid}`, updateBody);
        return data;
      }
      const { uid, ...createBody } = body;
      const { data } = await api.post('/api/users', createBody);
      return data;
    },
    onSuccess: () => {
      setError('');
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const saveRole = useMutation({
    mutationFn: async ({ uid, updates }) => {
      const { data } = await api.put(`/api/roles/${uid}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startEdit = (user) => {
    setError('');
    setForm({
      uid: user.uid,
      name: user.name || '',
      email: user.email || '',
      password: '',
      contact_number: user.contact_number || '',
      role: user.role || '',
      is_active: user.is_active,
    });
  };

  const resetForm = () => {
    setError('');
    setForm(emptyForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveUser.mutate(form);
  };

  const getRoleValue = (role, key) => roleDrafts[role.uid]?.[key] ?? role[key];

  const toggleRolePermission = (role, key) => {
    setRoleDrafts((current) => ({
      ...current,
      [role.uid]: {
        ...current[role.uid],
        [key]: !getRoleValue(role, key),
      },
    }));
  };

  const persistRole = (role) => {
    const updates = roleDrafts[role.uid];
    if (!updates) return;
    saveRole.mutate(
      { uid: role.uid, updates },
      {
        onSuccess: () => {
          setRoleDrafts((current) => {
            const next = { ...current };
            delete next[role.uid];
            return next;
          });
        },
      }
    );
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access control</p>
          <h1 className="page-title">User Management</h1>
        </div>
      </div>

      <div className="management-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>{form.uid ? 'Modify User' : 'Create User'}</h2>
            {form.uid && (
              <button type="button" className="btn-icon" title="Reset form" onClick={resetForm}>
                <RefreshCw size={18} />
              </button>
            )}
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
                required={!form.uid}
                placeholder={form.uid ? 'Leave blank to keep current' : ''}
              />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input
                value={form.contact_number}
                onChange={(e) => updateForm('contact_number', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => updateForm('role', e.target.value)} required>
                <option value="">Select role</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
                {/* Keep current value visible (but not re-selectable) when editing restricted roles */}
                {!isSuperAdmin && (form.role === 'super_admin' || form.role === 'admin') && (
                  <option value={form.role} disabled>
                    {form.role}
                  </option>
                )}
              </select>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateForm('is_active', e.target.checked)}
              />
              Active user
            </label>
          </div>

          {selectedRole && (
            <div className="permission-preview">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <span key={key} className={`badge ${selectedRole[key] ? 'badge-yes' : 'badge-no'}`}>
                  {label}: {selectedRole[key] ? 'Yes' : 'No'}
                </span>
              ))}
            </div>
          )}

          <button type="submit" className="btn btn-primary action-btn" disabled={saveUser.isPending}>
            {form.uid ? <Save size={18} /> : <UserPlus size={18} />}
            {saveUser.isPending ? 'Saving...' : form.uid ? 'Save Changes' : 'Create User'}
          </button>
        </form>

        <section className="panel">
          <div className="panel-header">
            <h2>Role Authority</h2>
          </div>
          <div className="table-wrap flat-table">
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  {Object.values(permissionLabels).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {rolesLoading && (
                  <tr>
                    <td colSpan={Object.keys(permissionLabels).length + 2} className="empty-state">
                      Loading roles...
                    </td>
                  </tr>
                )}
                {!rolesLoading &&
                  roles
                    .filter((role) => isSuperAdmin || (role.role_name !== 'admin' && role.role_name !== 'super_admin'))
                    .map((role) => {
                      // Admin cannot edit admin or super_admin roles; only super_admin can edit all
                      const isRestrictedRole = !isSuperAdmin && (role.role_name === 'admin' || role.role_name === 'super_admin');
                      const disabledReason = isRestrictedRole
                        ? 'Only Super Admin can modify admin/super_admin roles'
                        : role.role_name === currentUser?.role
                        ? 'You cannot modify your own role'
                        : null;
                      return (
                        <tr key={role.uid}>
                          <td>{role.role_name}</td>
                          {Object.keys(permissionLabels).map((key) => (
                            <td key={key}>
                              <input
                                type="checkbox"
                                checked={getRoleValue(role, key)}
                                disabled={isRestrictedRole || role.role_name === currentUser?.role}
                                onChange={() => toggleRolePermission(role, key)}
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              type="button"
                              className="btn-icon"
                              title={disabledReason || 'Save role permissions'}
                              disabled={isRestrictedRole || role.role_name === currentUser?.role || !roleDrafts[role.uid] || saveRole.isPending}
                              onClick={() => persistRole(role)}
                            >
                              <Save size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Loading users...
                </td>
              </tr>
            )}
            {!usersLoading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No users found
                </td>
              </tr>
            )}
            {!usersLoading &&
              users
                .filter(
                  (user) =>
                    // Super admin sees all except themselves
                    (isSuperAdmin && user.uid !== currentUser?.uid) ||
                    // Admin sees only regular users (not admin/super_admin) and not themselves
                    (!isSuperAdmin && user.role !== 'admin' && user.role !== 'super_admin' && user.uid !== currentUser?.uid)
                )
                .map((user) => (
                  <tr key={user.uid}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-yes' : 'badge-no'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.contact_number || '-'}</td>
                    <td>
                      <button type="button" className="btn-icon" title="Modify user" onClick={() => startEdit(user)}>
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
