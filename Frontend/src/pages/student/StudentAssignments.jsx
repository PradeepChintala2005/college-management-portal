import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentAssignments() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Homework submit form states
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');

  // Status alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch student class sections, coursework tasks, and submission history logs
  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Fetch student schedule enrollments
      const enrollRes = await api.get(`/api/enrollments/student/${user.studentId}`);
      if (enrollRes.data && enrollRes.data.success) {
        const studentSections = enrollRes.data.data.enrollments || [];
        setEnrollments(studentSections);

        // 2. Fetch assignments for each section
        if (studentSections.length > 0) {
          const assignPromises = studentSections.map((sec) =>
            api.get(`/api/assignments/section/${sec.class_section_id}`)
          );
          const assignResponses = await Promise.all(assignPromises);
          
          let compiledAssignments = [];
          assignResponses.forEach((res) => {
            if (res.data && res.data.success) {
              compiledAssignments = compiledAssignments.concat(res.data.data.assignments);
            }
          });
          setAllAssignments(compiledAssignments);
        }
      }

      // 3. Fetch submissions history logs
      const subRes = await api.get(`/api/submissions/student/${user.studentId}`);
      if (subRes.data && subRes.data.success) {
        setSubmissionHistory(subRes.data.data.submissions);
      }
    } catch (err) {
      console.error('Failed to sync student data:', err);
      setErrorMsg('Failed to sync coursework data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  // Submit Homework Answer
  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!activeAssignment || !submissionText.trim()) {
      setErrorMsg('Please write a submission answer text.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/api/submissions', {
        assignmentId: activeAssignment.assignment_id,
        studentId: user.studentId,
        submissionText: submissionText.trim()
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Homework coursework submitted successfully!');
        setSubmissionText('');
        setActiveAssignment(null);
        fetchStudentData(); // refresh list
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit homework.');
    }
  };

  // Check if an assignment has already been submitted by the student
  const getSubmissionForAssignment = (assignId) => {
    return submissionHistory.find((sub) => sub.assignment_id === assignId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          My Coursework & Assignments
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Track active class assignments, upload text replies or repository URLs, and read grader feedback.
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

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
          Compiling coursework catalogs...
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Left Panel: Active Assignments list & submit form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Submit Homework Form Modal Card */}
            {activeAssignment && (
              <div className="glass-panel" style={{ padding: '30px', border: '1px solid var(--color-primary-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0 }}>Submit Coursework</h4>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveAssignment(null)}>Cancel</button>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'hsl(var(--color-primary-hover))' }}>{activeAssignment.title}</div>
                  <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{activeAssignment.description}</div>
                </div>

                <form onSubmit={handleHomeworkSubmit}>
                  <div className="form-group">
                    <label className="form-label">Submission Text / Deliverables</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: '120px', resize: 'vertical' }}
                      placeholder="Type your answer, report summary, or paste your GitHub repository link here..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    Upload Homework Submission
                  </button>
                </form>
              </div>
            )}

            {/* Assignments List */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h4 style={{ marginBottom: '20px' }}>Syllabus Assignments Directory</h4>
              {allAssignments.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center' }}>No assignments are currently published for your classes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {allAssignments.map((a) => {
                    const sub = getSubmissionForAssignment(a.assignment_id);

                    return (
                      <div
                        key={a.assignment_id}
                        style={{
                          padding: '20px',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{a.course_code} - {a.section_name}</span>
                          {sub ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Submitted</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Pending</span>
                          )}
                        </div>

                        <h5 style={{ margin: '8px 0 2px 0', fontSize: '1rem' }}>{a.title}</h5>
                        {a.description && <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{a.description}</p>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.02)' }}>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Due Date: {a.due_date}</span>
                          {!sub && !activeAssignment && (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                              onClick={() => setActiveAssignment(a)}
                            >
                              Submit Homework
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Completed Submissions History logs */}
          <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
            <h4 style={{ marginBottom: '20px' }}>My Submission History</h4>
            {submissionHistory.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                You have not made any homework submissions yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissionHistory.map((sub) => (
                  <div
                    key={sub.submission_id}
                    style={{
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{sub.course_code}</span>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Submitted: {sub.submitted_at}</span>
                    </div>

                    <h5 style={{ margin: 0, fontSize: '0.9rem' }}>{sub.assignment_title}</h5>
                    
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'hsl(var(--text-secondary))',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}>
                      {sub.submission_text}
                    </div>

                    {sub.grade ? (
                      <div style={{
                        marginTop: '4px',
                        padding: '8px 12px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'hsl(var(--color-success))'
                      }}>
                        <strong>Grader Feedback:</strong> {sub.grade}
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Pending evaluation feedback from teacher.</span>
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
