import React, { useState, useEffect } from 'react';
import './admin.css'
import { authorizedFetch } from '../utils/api';

function Admin({ changeView }) {
    const [users, setUsers] = useState([]);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        password: '',
        is_superuser: false,
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        is_staff: false,
        is_active: false,
        groups: [],
        user_permissions: []
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [originalFormData, setOriginalFormData] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await authorizedFetch('/api/admin/users/');
            const data = await response.json();
            console.log(data);
            setUsers(data.results);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await authorizedFetch(`/api/admin/users/${id}/`, { method: 'DELETE' });
            fetchUsers();
            setShowDeletePopup(false); 
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleSaveUser = async () => {
        // Only check password confirmation for new users
        if (!currentUser && formData.password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        try {
            const method = currentUser ? 'PUT' : 'POST';
            const url = currentUser ? `/api/admin/users/${currentUser.id}/` : '/api/admin/users/';
            
            // Send full formData (includes password as received from API for updates)
            await authorizedFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            fetchUsers();
            closeUserDialog();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user');
        }
    };

    const openUserDialog = (user = null) => {
        setCurrentUser(user);
        const initialData = user ? {
            // Include password as received from API (not editable in UI)
            password: user.password || '',
            is_superuser: user.is_superuser || false,
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            is_staff: user.is_staff || false,
            is_active: user.is_active || false,
            groups: user.groups || [],
            user_permissions: user.user_permissions || []
        } : {
            password: '',
            is_superuser: false,
            username: '',
            first_name: '',
            last_name: '',
            email: '',
            is_staff: false,
            is_active: false,
            groups: [],
            user_permissions: []
        };
        setFormData(initialData);
        setOriginalFormData(JSON.parse(JSON.stringify(initialData))); // Deep copy
        setConfirmPassword('');
        setShowUserDialog(true);
    };

    const openDeletePopup = (id) => {
        setShowDeletePopup(id);
    };

    const openUserInfoDialog = (user) => {
        setSelectedUser(user);
        setShowUserInfoDialog(true);
    };

    const openPasswordDialog = (user) => {
        setCurrentUser(user);
        setPasswordData({
            newPassword: '',
            confirmPassword: ''
        });
        setShowPasswordDialog(true);
    };

    const handleUpdatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        if (!passwordData.newPassword) {
            alert('Password cannot be empty!');
            return;
        }
        try {
            await authorizedFetch(`/api/admin/users/${currentUser.id}/password/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: passwordData.newPassword }),
            });
            alert('Password updated successfully!');
            setShowPasswordDialog(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Error updating password');
        }
    };

    const closeUserDialog = () => {
        setFormData(originalFormData ? JSON.parse(JSON.stringify(originalFormData)) : {});
        setConfirmPassword('');
        setShowUserDialog(false);
        setCurrentUser(null);
        setOriginalFormData(null);
    };

    const closePasswordDialog = () => {
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setShowPasswordDialog(false);
        setCurrentUser(null);
    };

    return (
        <div className="admin">
            <h1>Admin Panel</h1>
            <button onClick={() => openUserDialog()}>Create User</button>
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(users) && users.map(user => (
                        <tr key={user.username}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                            <div>
                                <button onClick={() => openUserDialog(user)}>Update User</button>
                                <button onClick={() => openPasswordDialog(user)}>Update Password</button>
                                <button onClick={() => openDeletePopup(user.id)}>Delete User</button>
                                <button onClick={() => openUserInfoDialog(user)}>View User</button>
                            </div>
                                
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showDeletePopup && (
                <div className="modal-overlay">
                    <div className="dialog">
                        <p>Are you sure you want to delete this user?</p>
                        <div>
                            <button onClick={() => handleDelete(showDeletePopup)}>Yes</button>
                            <button onClick={() => setShowDeletePopup(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {showUserDialog && (
                <div className="modal-overlay">
                    <div className="dialog">
                        <h2>{currentUser ? 'Update User' : 'Create User'}</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
                            <label>
                                Username: *
                                <input type="text" placeholder="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                            </label>
                            <label>
                                Email:
                                <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </label>
                            {!currentUser && (
                                <>
                                    <label>
                                        Password: *
                                        <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                    </label>
                                    <label>
                                        Confirm Password: *
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </label>
                                </>
                            )}
                            <label>
                                First Name:
                                <input type="text" placeholder="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                            </label>
                            <label>
                                Last Name:
                                <input type="text" placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                            </label>
                            <label>
                                Groups (comma-separated IDs):
                                <input type="text" placeholder="Groups" value={formData.groups.join(',')} onChange={(e) => setFormData({ ...formData, groups: e.target.value.split(',').map(Number) })} />
                            </label>
                            <label>
                                Permissions (comma-separated IDs):
                                <input type="text" placeholder="Permissions" value={formData.user_permissions.join(',')} onChange={(e) => setFormData({ ...formData, user_permissions: e.target.value.split(',').map(Number) })} />
                            </label>
                            <label>
                                <input type="checkbox" checked={formData.is_superuser} onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })} /> Superuser
                            </label>
                            <label>
                                <input type="checkbox" checked={formData.is_staff} onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })} /> Staff
                            </label>
                            <label>
                                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} /> Active
                            </label>
                            <button type="submit">OK</button>
                            <button type="button" onClick={closeUserDialog}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {showUserInfoDialog && selectedUser && (
                <div className="modal-overlay">
                    <div className="dialog">
                        <h2>User Information</h2>
                        <p><strong>Username:</strong> {selectedUser.username}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>First Name:</strong> {selectedUser.first_name}</p>
                        <p><strong>Last Name:</strong> {selectedUser.last_name}</p>
                        <p><strong>Superuser:</strong> {selectedUser.is_superuser ? 'Yes' : 'No'}</p>
                        <p><strong>Staff:</strong> {selectedUser.is_staff ? 'Yes' : 'No'}</p>
                        <p><strong>Active:</strong> {selectedUser.is_active ? 'Yes' : 'No'}</p>
                        <p><strong>Groups:</strong> {selectedUser.groups.join(', ')}</p>
                        <p><strong>Permissions:</strong> {selectedUser.user_permissions.join(', ')}</p>
                        <button onClick={() => setShowUserInfoDialog(false)}>Close</button>
                    </div>
                </div>
            )}

            {showPasswordDialog && currentUser && (
                <div className="modal-overlay">
                    <div className="dialog">
                        <h2>Update Password for {currentUser.username}</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }}>
                            <label>
                                New Password: *
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={passwordData.newPassword} 
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                                    required 
                                />
                            </label>
                            <label>
                                Confirm New Password: *
                                <input 
                                    type="password" 
                                    placeholder="Confirm New Password" 
                                    value={passwordData.confirmPassword} 
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                                    required 
                                />
                            </label>
                            <button type="submit">Update Password</button>
                            <button type="button" onClick={closePasswordDialog}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;