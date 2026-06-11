import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all notices and departments
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [announceRes, deptRes] = await Promise.all([
        api.get('/api/announcements'),
        api.get('/api/departments')
      ]);

      if (announceRes.data && announceRes.data.success) {
        setAnnouncements(announceRes.data.data.announcements || []);
      }
      if (deptRes.data && deptRes.data.success) {
        setDepartments(deptRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to sync notice board bulletins feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Post new Notice
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setErrorMsg('Please enter both title and notice content.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/api/announcements', {
        title: title.trim(),
        content: content.trim(),
        departmentId: departmentId ? parseInt(departmentId, 10) : null
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Notice bulletin published successfully!');
        setTitle('');
        setContent('');
        setDepartmentId('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to post announcement notice.');
    }
  };

  // Delete notice
  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.delete(`/api/announcements/${id}`);
      if (res.data && res.data.success) {
        setSuccessMsg('Notice deleted successfully.');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete notice.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Notice Board & Announcements Console
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Publish general or department-specific notices and manage all active notice bulletins.
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
        {/* Post notice card */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>Publish Notice Bulletin</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Notice Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Campus Holiday, Semester Exams"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience / Department</label>
              <select
                className="form-input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
              >
                <option value="">-- School Wide (General Notice) --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notice Details</label>
              <textarea
                className="form-input"
                style={{ minHeight: '120px', resize: 'vertical' }}
                placeholder="Write announcement description here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Publish Announcement
            </button>
          </form>
        </div>

        {/* Notice board feed list */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ marginBottom: '20px' }}>Active Notice Bulletins</h4>
          {loading ? (
            <p className="text-secondary" style={{ textAlign: 'center' }}>Syncing notice feed...</p>
          ) : announcements.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
              No active announcements found on notice board.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {announcements.map((notice) => (
                <div
                  key={notice.announcement_id}
                  style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Header details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        {notice.department_code || 'General'}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>{notice.title}</span>
                    </div>

                    {/* Author & controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{notice.created_at}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                        onClick={() => handleDeleteNotice(notice.announcement_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Body text */}
                  <p className="text-secondary" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {notice.content}
                  </p>

                  {/* Footer details */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '8px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                    Author: {notice.author_name} ({notice.author_email})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
