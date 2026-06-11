import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function FacultyAssignments() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  
  // Assignment listing and creation
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Submissions roster listing
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [gradeInputs, setGradeInputs] = useState({}); // submissionId -> grade text

  // Messages
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch sections taught by this instructor
  const fetchFacultySections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/sections');
      if (res.data && res.data.success) {
        const facultySections = (res.data.data.sections || []).filter(
          (sec) => sec.faculty_id === user.facultyId
        );
        setSections(facultySections);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load class sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultySections();
  }, []);

  const handleSectionChange = async (e) => {
    const sectionId = e.target.value;
    setSelectedSectionId(sectionId);
    setAssignments([]);
    setSelectedAssignmentId('');
    setSubmissions([]);
    setErrorMsg('');
    setSuccessMsg('');

    if (!sectionId) return;

    try {
      setLoading(true);
      const res = await api.get(`/api/assignments/section/${sectionId}`);
      if (res.data && res.data.success) {
        setAssignments(res.data.data.assignments);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load assignments list.');
    } finally {
      setLoading(false);
    }
  };

  // Publish New Homework Assignment
  const handlePublishAssignment = async (e) => {
    e.preventDefault();
    if (!selectedSectionId || !title || !dueDate) {
      setErrorMsg('Please enter assignment title and due date.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/api/assignments', {
        classSectionId: parseInt(selectedSectionId, 10),
        title: title.trim(),
        description: description.trim(),
        dueDate
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Homework coursework published successfully!');
        setTitle('');
        setDescription('');
        setDueDate('');
        
        // Refresh assignments list
        const assignRes = await api.get(`/api/assignments/section/${selectedSectionId}`);
        if (assignRes.data && assignRes.data.success) {
          setAssignments(assignRes.data.data.assignments);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to publish assignment task.');
    }
  };

  // View Submissions for selected Homework Assignment
  const handleViewSubmissions = async (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    setSubmissions([]);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      const res = await api.get(`/api/submissions/assignment/${assignmentId}`);
      if (res.data && res.data.success) {
        setSubmissions(res.data.data.roster);
        // Initialize grade inputs dictionary with existing grades if any
        const inputs = {};
        res.data.data.roster.forEach((sub) => {
          inputs[sub.submission_id] = sub.grade || '';
        });
        setGradeInputs(inputs);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch homework submissions roster.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Grade / Feedback comments for submission
  const handleGradeSubmit = async (submissionId) => {
    const gradeVal = gradeInputs[submissionId];
    if (!gradeVal) {
      alert('Please enter grade score or feedback comments first.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post(`/api/submissions/${submissionId}/grade`, {
        grade: gradeVal.trim()
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Homework graded successfully!');
        handleViewSubmissions(selectedAssignmentId); // reload submissions list
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save grade evaluation.');
    }
  };

  const handleGradeInputChange = (subId, val) => {
    setGradeInputs({
      ...gradeInputs,
      [subId]: val
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Coursework & Submissions Workspace
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Publish class assignments, review student submissions, and log grades.
        </p>
      </div>

      {/* Select class section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ margin: 0 }}>Select Active Class Section</label>
          <select
            className="form-input"
            value={selectedSectionId}
            onChange={handleSectionChange}
            style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
          >
            <option value="">-- Choose Class Section --</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.course_code} {sec.course_title} ({sec.section_name} - {sec.semester})
              </option>
            ))}
          </select>
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

      {selectedSectionId && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.5fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Left Column: Create Homework & List Assignments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Create Assignment Form */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h4 style={{ marginBottom: '20px' }}>Publish Homework Task</h4>
              <form onSubmit={handlePublishAssignment}>
                <div className="form-group">
                  <label className="form-label">Assignment Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AOS Lab 1: custom shell"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Instructions</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Provide details, deliverables, or link to files..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  Publish Homework Task
                </button>
              </form>
            </div>

            {/* List Published Assignments */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h4 style={{ marginBottom: '20px' }}>Active Assignments</h4>
              {assignments.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center' }}>No assignments published for this section.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {assignments.map((a) => (
                    <div
                      key={a.assignment_id}
                      style={{
                        padding: '16px',
                        background: selectedAssignmentId === a.assignment_id ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                        border: selectedAssignmentId === a.assignment_id ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{a.title}</h5>
                      {a.description && <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{a.description}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Due: {a.due_date}</span>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleViewSubmissions(a.assignment_id)}
                        >
                          Review Submissions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Review Submissions roster */}
          <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
            <h4 style={{ marginBottom: '16px' }}>Student Submissions Roster</h4>
            {!selectedAssignmentId ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
                Select an assignment from the left panel to review and grade submissions.
              </p>
            ) : loading ? (
              <p className="text-secondary" style={{ textAlign: 'center' }}>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                No submissions recorded yet for this assignment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {submissions.map((sub) => (
                  <div
                    key={sub.submission_id}
                    style={{
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Header info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{sub.first_name} {sub.last_name}</span>
                        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '10px' }}>({sub.roll_number})</span>
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>Submitted: {sub.submitted_at}</span>
                    </div>

                    {/* Submission content */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(13, 10, 28, 0.6)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto'
                    }}>
                      {sub.submission_text}
                    </div>

                    {/* Grading actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '12px' }}>
                      <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label className="form-label" style={{ margin: 0, textTransform: 'none', fontSize: '0.8rem' }}>Grade/Feedback:</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Grade: A | Excellent custom shell"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                          value={gradeInputs[sub.submission_id] || ''}
                          onChange={(e) => handleGradeInputChange(sub.submission_id, e.target.value)}
                        />
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => handleGradeSubmit(sub.submission_id)}
                      >
                        Log Grade
                      </button>
                    </div>

                    {/* Display current grade if any */}
                    {sub.grade && (
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--color-success))', fontWeight: 'bold' }}>
                        Active Grade: <span className="text-secondary" style={{ fontWeight: 'normal', color: '#fff' }}>{sub.grade}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
