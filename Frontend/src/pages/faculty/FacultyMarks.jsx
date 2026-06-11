import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function FacultyMarks() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [roster, setRoster] = useState([]); // students enrolled
  const [gradesSpreadsheet, setGradesSpreadsheet] = useState([]); // class grading sheet
  const [loading, setLoading] = useState(false);

  // Form states to log mark
  const [studentId, setStudentId] = useState('');
  const [examType, setExamType] = useState('Quiz');
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('');

  // Messages
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
    setRoster([]);
    setGradesSpreadsheet([]);
    setStudentId('');
    setMarksObtained('');
    setMaxMarks('');
    setErrorMsg('');
    setSuccessMsg('');

    if (!sectionId) return;

    try {
      setLoading(true);
      // 1. Fetch student roster enrolled in section
      const rosterRes = await api.get(`/api/enrollments/section/${sectionId}`);
      if (rosterRes.data && rosterRes.data.success) {
        setRoster(rosterRes.data.data.roster);
      }

      // 2. Fetch class section marks spreadsheet
      const marksRes = await api.get(`/api/marks/section/${sectionId}`);
      if (marksRes.data && marksRes.data.success) {
        setGradesSpreadsheet(marksRes.data.data.grades);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load roster or grading sheet.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Mark Log Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSectionId || !studentId || !marksObtained || !maxMarks) {
      setErrorMsg('Please enter all required marks evaluation fields.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    const obtainedNum = parseFloat(marksObtained);
    const maxNum = parseFloat(maxMarks);

    if (obtainedNum < 0 || maxNum <= 0) {
      setErrorMsg('Obtained score cannot be negative. Max marks must be positive.');
      return;
    }

    if (obtainedNum > maxNum) {
      setErrorMsg(`Input Error: Obtained score (${obtainedNum}) cannot exceed maximum score limit (${maxNum}).`);
      return;
    }

    try {
      const res = await api.post('/api/marks', {
        studentId: parseInt(studentId, 10),
        classSectionId: parseInt(selectedSectionId, 10),
        examType,
        marksObtained: obtainedNum,
        maxMarks: maxNum
      });

      if (res.data && res.data.success) {
        setSuccessMsg('Marks recorded successfully!');
        setStudentId('');
        setMarksObtained('');
        setMaxMarks('');
        
        // Refresh grading sheet
        const marksRes = await api.get(`/api/marks/section/${selectedSectionId}`);
        if (marksRes.data && marksRes.data.success) {
          setGradesSpreadsheet(marksRes.data.data.grades);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to record mark entries.');
    }
  };

  const handleDeleteMark = async (markId) => {
    if (!window.confirm('Are you sure you want to delete this mark entry?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.delete(`/api/marks/${markId}`);
      if (res.data && res.data.success) {
        setSuccessMsg('Mark entry removed successfully.');
        // Refresh
        const marksRes = await api.get(`/api/marks/section/${selectedSectionId}`);
        if (marksRes.data && marksRes.data.success) {
          setGradesSpreadsheet(marksRes.data.data.grades);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete mark record.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Grades & Marks Manager
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Input exam scores, manage student evaluations, and export class grading spreadsheets.
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
          gridTemplateColumns: '1fr 1.5fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Left Column: Grade logger Form */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h4 style={{ marginBottom: '20px' }}>Log Assessment Grade</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select
                  className="form-input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                  required
                >
                  <option value="">-- Choose Student Roster --</option>
                  {roster.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.first_name} {s.last_name} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assessment Type</label>
                <select
                  className="form-input"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  style={{ background: 'rgba(13, 10, 28, 0.95)', color: '#fff' }}
                  required
                >
                  <option value="Quiz">Quiz</option>
                  <option value="Midterm">Midterm</option>
                  <option value="Final">Final Exam</option>
                  <option value="Assignment">Course Assignment</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Marks Obtained</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 85.5"
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maximum Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 100"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                Log Assessment Score
              </button>
            </form>
          </div>

          {/* Right Column: Section grading spreadsheet */}
          <div className="glass-panel" style={{ padding: '30px', overflowX: 'auto' }}>
            <h4 style={{ marginBottom: '16px' }}>Section Grading Ledger</h4>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
              Complete record of all scored assessments logged for students in this section.
            </p>

            {loading ? (
              <p className="text-secondary" style={{ textAlign: 'center' }}>Compiling grading sheets...</p>
            ) : gradesSpreadsheet.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                No score records logged yet.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase' }}>Assessment</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesSpreadsheet.map((g) => {
                    const ratio = Math.round((g.marks_obtained / g.max_marks) * 100);

                    return (
                      <tr key={g.mark_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: '600' }}>{g.first_name} {g.last_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{g.roll_number}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{g.exam_type}</span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                          <div>{g.marks_obtained} / {g.max_marks}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: ratio >= 75 ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))' }}>
                            {ratio}%
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(239, 68, 68, 0.15)', color: 'hsl(var(--color-danger))' }}
                            onClick={() => handleDeleteMark(g.mark_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
