import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'faculty'
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  // Student specific
  const [rollNumber, setRollNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Faculty specific
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');

  // Status message states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingItem, setEditingItem] = useState(null); // holds user profile object if editing

  // Fetch departments list for dropdown selector
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/departments');
      if (res.data && res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // Fetch students database
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/students');
      if (res.data && res.data.success) {
        setStudents(res.data.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      setErrorMsg('Failed to load students directory.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch faculty database
  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/faculty');
      if (res.data && res.data.success) {
        setFaculty(res.data.data.faculty || []);
      }
    } catch (err) {
      console.error('Failed to load faculty:', err);
      setErrorMsg('Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    if (activeTab === 'students') {
      fetchStudents();
    } else {
      fetchFaculty();
    }
    clearForm();
    setErrorMsg('');
    setSuccessMsg('');
  }, [activeTab]);

  // Handle Create or Update User
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !firstName || !lastName) {
      setErrorMsg('Please enter email, first name, and last name.');
      return;
    }

    // Prepare payload
    const commonData = {
      email,
      firstName,
      lastName,
      phone: phone ? phone.trim() : null,
      departmentId: departmentId ? parseInt(departmentId, 10) : null
    };

    try {
      if (activeTab === 'students') {
        if (!rollNumber) {
          setErrorMsg('Roll number is required for students.');
          return;
        }

        if (editingItem) {
          // Update Student
          const res = await api.put(`/api/students/${editingItem.id}`, {
            ...commonData,
            rollNumber,
            dateOfBirth: dateOfBirth || null
          });
          if (res.data && res.data.success) {
            setSuccessMsg('Student profile updated successfully!');
            clearForm();
            fetchStudents();
          }
        } else {
          // Onboard New Student
          if (!password) {
            setErrorMsg('Password is required to create a new student user.');
            return;
          }
          const res = await api.post('/api/students', {
            ...commonData,
            password,
            rollNumber,
            dateOfBirth: dateOfBirth || null
          });
          if (res.data && res.data.success) {
            setSuccessMsg('Student onboarded successfully!');
            clearForm();
            fetchStudents();
          }
        }
      } else {
        // Faculty Tab
        if (!employeeId) {
          setErrorMsg('Employee ID is required for faculty.');
          return;
        }

        if (editingItem) {
          // Update Faculty
          const res = await api.put(`/api/faculty/${editingItem.id}`, {
            ...commonData,
            employeeId,
            designation: designation || null
          });
          if (res.data && res.data.success) {
            setSuccessMsg('Faculty profile updated successfully!');
            clearForm();
            fetchFaculty();
          }
        } else {
          // Onboard New Faculty
          if (!password) {
            setErrorMsg('Password is required to create a new faculty user.');
            return;
          }
          const res = await api.post('/api/faculty', {
            ...commonData,
            password,
            employeeId,
            designation: designation || null
          });
          if (res.data && res.data.success) {
            setSuccessMsg('Faculty onboarded successfully!');
            clearForm();
            fetchFaculty();
          }
        }
      }
    } catch (err) {
      console.error('User transaction error:', err);
      setErrorMsg(err.response?.data?.message || 'Transaction failed. Check values or email uniqueness.');
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEmail(item.email);
    setFirstName(item.first_name);
    setLastName(item.last_name);
    setPhone(item.phone || '');
    setDepartmentId(item.department_id || '');
    
    if (activeTab === 'students') {
      setRollNumber(item.roll_number);
      setDateOfBirth(item.date_of_birth || '');
    } else {
      setEmployeeId(item.employee_id);
      setDesignation(item.designation || '');
    }
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteClick = async (id) => {
    const roleSingular = activeTab === 'students' ? 'student' : 'faculty';
    if (!window.confirm(`Are you sure you want to delete this ${roleSingular}? This action will wipe their login credentials and all associated profiles from the database.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const endpoint = activeTab === 'students' ? `/api/students/${id}` : `/api/faculty/${id}`;
      const res = await api.delete(endpoint);
      if (res.data && res.data.success) {
        setSuccessMsg(`${roleSingular.toUpperCase()} deleted successfully.`);
        if (editingItem?.id === id) {
          clearForm();
        }
        if (activeTab === 'students') fetchStudents();
        else fetchFaculty();
      }
    } catch (err) {
      console.error(`Failed to delete ${roleSingular}:`, err);
      setErrorMsg(`Failed to delete profile. Database integrity blocks or server error.`);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setDepartmentId('');
    setRollNumber('');
    setDateOfBirth('');
    setEmployeeId('');
    setDesignation('');
    setEditingItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            User Account Management
          </h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Onboard, list, edit, and delete student and faculty directory records.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="glass-panel" style={{ padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '4px' }}>
          <button
            className={activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('students')}
          >
            Students Register
          </button>
          <button
            className={activeTab === 'faculty' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('faculty')}
          >
            Faculty Register
          </button>
        </div>
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
        gridTemplateColumns: '1fr 1.8fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Onboarding Form */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>
            {editingItem ? 'Edit Profile Details' : `Onboard New ${activeTab === 'students' ? 'Student' : 'Faculty'}`}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder={activeTab === 'students' ? 'student@college.edu' : 'faculty@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={editingItem} // Email acts as unique login key, block modification
                required
              />
            </div>

            {!editingItem && (
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Department Assignment</label>
              <select
                className="form-input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
              >
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="123-456-7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Student specific fields */}
            {activeTab === 'students' && (
              <>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ROLL-CSE-2026"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Faculty specific fields */}
            {activeTab === 'faculty' && (
              <>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. FAC-CSE-99"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation / Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Assistant Professor"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                {editingItem ? 'Save Updates' : `Onboard ${activeTab === 'students' ? 'Student' : 'Faculty'}`}
              </button>
              {(editingItem || email || firstName || lastName) && (
                <button type="button" className="btn-secondary" onClick={clearForm}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Directory Listing Grid */}
        <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
          <h4 style={{ marginBottom: '20px' }}>
            {activeTab === 'students' ? 'Students Directory' : 'Faculty Directory'}
          </h4>

          {loading ? (
            <p className="text-secondary" style={{ textAlign: 'center' }}>Loading user database...</p>
          ) : (activeTab === 'students' ? students.length === 0 : faculty.length === 0) ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
              No {activeTab} are registered.
            </p>
          ) : activeTab === 'students' ? (
            /* Student Directory Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Roll No</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Dept</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{student.roll_number}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '500' }}>{student.first_name} {student.last_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{student.email}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {student.department_code ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{student.department_code}</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleEditClick(student)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDeleteClick(student.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Faculty Directory Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Emp ID</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Dept / Title</th>
                  <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{member.employee_id}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '500' }}>{member.first_name} {member.last_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{member.email}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {member.department_code ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', alignSelf: 'start' }}>{member.department_code}</span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>No Dept</span>
                        )}
                        {member.designation && (
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{member.designation}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleEditClick(member)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                          onClick={() => handleDeleteClick(member.id)}
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
