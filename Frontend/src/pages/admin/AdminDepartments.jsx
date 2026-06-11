import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // holds dept object if editing

  // Fetch all departments on component mount
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/departments');
      if (res.data && res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
      setErrorMsg('Could not fetch departments list from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) {
      setErrorMsg('Please enter both department name and code.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingDept) {
        // Edit Mode
        const res = await api.put(`/api/departments/${editingDept.id}`, {
          name,
          code,
          description
        });
        if (res.data && res.data.success) {
          setSuccessMsg('Department updated successfully!');
          setEditingDept(null);
          clearForm();
          fetchDepartments();
        }
      } else {
        // Add Mode
        const res = await api.post('/api/departments', {
          name,
          code,
          description
        });
        if (res.data && res.data.success) {
          setSuccessMsg('Department added successfully!');
          clearForm();
          fetchDepartments();
        }
      }
    } catch (err) {
      console.error('Department operation error:', err);
      setErrorMsg(err.response?.data?.message || 'Operation failed. Make sure code is unique.');
    }
  };

  const handleEditClick = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? This will set department as null for associated students and faculty.')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.delete(`/api/departments/${id}`);
      if (res.data && res.data.success) {
        setSuccessMsg('Department deleted successfully!');
        if (editingDept?.id === id) {
          setEditingDept(null);
          clearForm();
        }
        fetchDepartments();
      }
    } catch (err) {
      console.error('Failed to delete department:', err);
      setErrorMsg('Failed to delete department. Access denied or server error.');
    }
  };

  const clearForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setEditingDept(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Manage Departments
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          View, add, edit, and delete academic departments in the portal registry.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <span className="badge badge-danger" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {errorMsg}
        </span>
      )}
      {successMsg && (
        <span className="badge badge-success" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>
          {successMsg}
        </span>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>
            {editingDept ? 'Edit Department Details' : 'Onboard New Department'}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Department Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science & Eng"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CSE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Brief summary of department syllabus focus..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                {editingDept ? 'Save Changes' : 'Onboard Department'}
              </button>
              {(editingDept || name || code) && (
                <button type="button" className="btn-secondary" onClick={clearForm}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Directory Listing Grid */}
        <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
          <h4 style={{ marginBottom: '20px' }}>Departments Directory</h4>
          {loading ? (
            <p className="text-secondary" style={{ textAlign: 'center' }}>Loading registry database...</p>
          ) : departments.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
              No departments are currently onboarded.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        {dept.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '0.9rem' }}>
                      <div>{dept.name}</div>
                      {dept.description && (
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          {dept.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleEditClick(dept)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDeleteClick(dept.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
