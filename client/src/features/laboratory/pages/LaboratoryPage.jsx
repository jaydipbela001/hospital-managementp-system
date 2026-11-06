import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './LaboratoryPage.css';

export default function LaboratoryPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const isLabTech = ['LAB_TECHNICIAN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' or 'CATALOGUE'
  const [orders, setOrders] = useState([]);
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Result entry modal
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [interpretation, setInterpretation] = useState('');

  // Report view modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, testsRes, patRes] = await Promise.all([
        apiClient('/laboratory'),
        apiClient('/laboratory/tests'),
        apiClient('/patients'),
      ]);
      setOrders(ordersRes?.data || []);
      setTests(testsRes?.data || []);
      setPatients(patRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedTestId) {
      toast.warning('Please select a patient and diagnostic test.');
      return;
    }

    try {
      setSavingOrder(true);
      await apiClient('/laboratory', {
        body: {
          patientId: selectedPatientId,
          testId: selectedTestId,
          priority,
          clinicalNotes,
        },
      });
      toast.success('Diagnostic laboratory test ordered successfully!');
      setOrderModalOpen(false);
      setSelectedPatientId('');
      setSelectedTestId('');
      setClinicalNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to order lab test');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleUpdateStatus = async (id, status, extra = {}) => {
    try {
      await apiClient(`/laboratory/${id}/status`, {
        method: 'PATCH',
        body: { status, ...extra },
      });
      toast.success(`Lab order updated to ${status.replace('_', ' ')}`);
      setResultModalOpen(false);
      setActiveOrder(null);
      setResultValue('');
      setInterpretation('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: p.name,
    subtext: `ID: ${p.patientCode} • Phone: ${p.phone} • Blood: ${p.bloodGroup || '—'}`,
  }));

  const testOptions = tests.map((t) => ({
    value: t._id,
    label: `${t.testName} (${t.testCode})`,
    subtext: `${t.category} • ₹${t.price} • Sample: ${t.sampleType}`,
  }));

  return (
    <div className="lab-container" style={{ padding: 'var(--space-6)' }}>
      <PageHeader
        title="Laboratory & Pathology Diagnostics"
        subtitle="Manage diagnostic test orders, specimen sample intake, and verified laboratory reports"
        actions={
          (isDoctor || user?.role === 'SUPER_ADMIN') && (
            <Button variant="primary" onClick={() => setOrderModalOpen(true)}>
              + Order Lab Test
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '1.25rem 0' }}>
        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'ORDERS' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'ORDERS' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🔬 Orders & Specimen Queue ({orders.filter((o) => o.status !== 'COMPLETED').length} Pending)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CATALOGUE')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'CATALOGUE' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'CATALOGUE' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📋 Diagnostic Test Catalogue ({tests.length} Configured)
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : activeTab === 'ORDERS' ? (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Order Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem' }}>Test Ordered</th>
                <th style={{ padding: '0.75rem 1rem' }}>Doctor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-800)' }}>
                    {o.orderCode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{o.patientId?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {o.patientId?.patientCode} • {o.patientId?.gender}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{o.testId?.testName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {o.testId?.category} • Sample: {o.testId?.sampleType} • ₹{o.testId?.price}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>Dr. {o.doctorId?.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: o.priority === 'STAT' ? '#fee2e2' : o.priority === 'URGENT' ? '#ffedd5' : '#f1f5f9',
                        color: o.priority === 'STAT' ? '#b91c1c' : o.priority === 'URGENT' ? '#c2410c' : '#475569',
                      }}
                    >
                      {o.priority}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: o.status === 'COMPLETED' ? '#dcfce7' : '#eff6ff',
                        color: o.status === 'COMPLETED' ? '#15803d' : '#1d4ed8',
                      }}
                    >
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {/* Lab Tech Workflow Buttons */}
                      {isLabTech && o.status === 'ORDERED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(o._id, 'SAMPLE_COLLECTED')}
                        >
                          Collect Sample
                        </Button>
                      )}
                      {isLabTech && o.status === 'SAMPLE_COLLECTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(o._id, 'IN_ANALYSIS')}
                        >
                          Start Analysis
                        </Button>
                      )}
                      {isLabTech && (o.status === 'IN_ANALYSIS' || o.status === 'SAMPLE_COLLECTED') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveOrder(o);
                            setResultModalOpen(true);
                          }}
                        >
                          Enter Result
                        </Button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(o);
                            setReportModalOpen(true);
                          }}
                        >
                          View Report
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Catalogue Table */
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Test Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Department Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Specimen</th>
                <th style={{ padding: '0.75rem 1rem' }}>Standard Range</th>
                <th style={{ padding: '0.75rem 1rem' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{t.testCode}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{t.testName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{t.category}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{t.sampleType}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{t.normalRange} {t.unit}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-primary-800)' }}>₹{t.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Test Modal */}
      {orderModalOpen && (
        <Modal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          title="Order Diagnostic Laboratory Test"
          maxWidth="560px"
        >
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CustomSelect
              label="Select Patient"
              required
              options={patientOptions}
              value={selectedPatientId}
              onChange={(val) => setSelectedPatientId(val)}
              placeholder="Search or choose patient..."
            />

            <CustomSelect
              label="Select Diagnostic Test"
              required
              options={testOptions}
              value={selectedTestId}
              onChange={(val) => setSelectedTestId(val)}
              placeholder="Choose test (e.g. CBC, Lipid, FBS)..."
            />

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              >
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT (Immediate Emergency)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Clinical Indication / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Suspected anemia, pre-op evaluation"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingOrder}>
                {savingOrder ? 'Ordering...' : 'Confirm Lab Order'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Result Entry Modal (Lab Tech) */}
      {resultModalOpen && activeOrder && (
        <Modal
          isOpen={resultModalOpen}
          onClose={() => setResultModalOpen(false)}
          title={`Enter Laboratory Result • ${activeOrder.orderCode}`}
          maxWidth="520px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateStatus(activeOrder._id, 'COMPLETED', { resultValue, interpretation });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ padding: '0.75rem', background: 'var(--color-surface-muted)', borderRadius: '6px' }}>
              <div><strong>Test:</strong> {activeOrder.testId?.testName}</div>
              <div><strong>Patient:</strong> {activeOrder.patientId?.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Standard Reference: {activeOrder.testId?.normalRange} {activeOrder.testId?.unit}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Measured Result Value <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder={`e.g. 95 (Units: ${activeOrder.testId?.unit || 'standard'})`}
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Technician Interpretation / Clinical Impression:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Within normal limits. Verified on automated analyzer."
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setResultModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Verify & Release Report
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Lab Report View Modal */}
      {reportModalOpen && selectedReport && (
        <Modal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title={`Diagnostic Lab Report • ${selectedReport.orderCode}`}
          maxWidth="580px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface-muted)', borderRadius: '6px' }}>
              <div>
                <strong>Patient:</strong> {selectedReport.patientId?.name} ({selectedReport.patientId?.patientCode})
                <div>Gender: {selectedReport.patientId?.gender} | Blood: {selectedReport.patientId?.bloodGroup}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Ordered by:</strong> Dr. {selectedReport.doctorId?.name}
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {new Date(selectedReport.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                Test: {selectedReport.testId?.testName}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
                {selectedReport.result?.resultValue} <span style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedReport.testId?.unit}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                Reference Range: {selectedReport.testId?.normalRange} {selectedReport.testId?.unit}
              </div>
            </div>

            {selectedReport.result?.interpretation && (
              <div>
                <strong>Technician Impression:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#334155' }}>{selectedReport.result.interpretation}</p>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
              Verified by: {selectedReport.result?.enteredBy?.name || 'Laboratory Staff'} on {selectedReport.result?.verifiedAt ? new Date(selectedReport.result.verifiedAt).toLocaleString() : '—'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="primary" onClick={() => setReportModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

