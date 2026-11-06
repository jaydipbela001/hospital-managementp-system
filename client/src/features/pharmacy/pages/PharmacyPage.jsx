import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './PharmacyPage.css';

export default function PharmacyPage() {
  const { user } = useAuth();
  const isPharmacist = ['PHARMACIST', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('INVENTORY'); // 'INVENTORY' or 'DISPENSE_LOG'
  const [medicines, setMedicines] = useState([]);
  const [dispenses, setDispenses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispense Modal
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [savingDispense, setSavingDispense] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dispenseItems, setDispenseItems] = useState([{ medicineId: '', quantity: 1 }]);
  const [remarks, setRemarks] = useState('');

  // Add Batch Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [activeMedForBatch, setActiveMedForBatch] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchQty, setBatchQty] = useState(100);
  const [purchasePrice, setPurchasePrice] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medsRes, dispRes, patRes] = await Promise.all([
        apiClient('/pharmacy/medicines'),
        apiClient('/pharmacy'),
        apiClient('/patients'),
      ]);
      setMedicines(medsRes?.data || []);
      setDispenses(dispRes?.data || []);
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

  const handleAddItemRow = () => {
    setDispenseItems([...dispenseItems, { medicineId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (dispenseItems.length === 1) return;
    setDispenseItems(dispenseItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...dispenseItems];
    updated[idx][field] = val;
    setDispenseItems(updated);
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.warning('Please select a patient.');
      return;
    }
    const validItems = dispenseItems.filter((it) => it.medicineId && it.quantity > 0);
    if (validItems.length === 0) {
      toast.warning('Please select at least one medicine to dispense.');
      return;
    }

    try {
      setSavingDispense(true);
      await apiClient('/pharmacy/dispense', {
        body: {
          patientId: selectedPatientId,
          items: validItems,
          remarks,
        },
      });
      toast.success('Medicines successfully dispensed & stock deducted!');
      setDispenseModalOpen(false);
      setSelectedPatientId('');
      setDispenseItems([{ medicineId: '', quantity: 1 }]);
      setRemarks('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Dispensing failed');
    } finally {
      setSavingDispense(false);
    }
  };

  const handleAddBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient(`/pharmacy/medicines/${activeMedForBatch._id}/batches`, {
        body: {
          batchNumber,
          expiryDate,
          quantity: parseInt(batchQty, 10),
          purchasePrice: parseFloat(purchasePrice),
        },
      });
      toast.success('Stock batch added successfully!');
      setBatchModalOpen(false);
      setActiveMedForBatch(null);
      setBatchNumber('');
      setExpiryDate('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add batch');
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: p.name,
    subtext: `ID: ${p.patientCode} • Phone: ${p.phone}`,
  }));

  const medOptions = medicines.map((m) => ({
    value: m._id,
    label: `${m.name} (${m.unit})`,
    subtext: `Stock: ${m.stockQuantity} • ₹${m.unitPrice}`,
  }));

  return (
    <div className="pharmacy-container" style={{ padding: 'var(--space-6)' }}>
      <PageHeader
        title="Pharmacy & Medication Dispensary"
        subtitle="Manage drug inventory, expiry date batches, stock reorder levels, and patient prescription dispensing"
        actions={
          isPharmacist && (
            <Button variant="primary" onClick={() => setDispenseModalOpen(true)}>
              💊 Dispense Medicines
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '1.25rem 0' }}>
        <button
          type="button"
          onClick={() => setActiveTab('INVENTORY')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'INVENTORY' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'INVENTORY' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📦 Medicine Stock & Batches ({medicines.length} Catalogued)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DISPENSE_LOG')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'DISPENSE_LOG' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'DISPENSE_LOG' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🧾 Dispensing Ledger ({dispenses.length} Records)
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : activeTab === 'INVENTORY' ? (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Medicine Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Unit Price</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock Available</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batches</th>
                {isPharmacist && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => {
                const isLow = m.stockQuantity <= m.reorderLevel;
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{m.medicineCode}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      {m.genericName && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.genericName}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{m.category}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>₹{m.unitPrice}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          background: isLow ? '#fee2e2' : '#dcfce7',
                          color: isLow ? '#b91c1c' : '#15803d',
                        }}
                      >
                        {m.stockQuantity} {m.unit}s {isLow && '⚠️ Low Stock'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>
                      {m.batches?.length || 0} Batch(es)
                    </td>
                    {isPharmacist && (
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveMedForBatch(m);
                            setBatchModalOpen(true);
                          }}
                        >
                          + Add Batch
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Dispense Ledger */
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Bill Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem' }}>Items Dispensed</th>
                <th style={{ padding: '0.75rem 1rem' }}>Total Amount</th>
                <th style={{ padding: '0.75rem 1rem' }}>Dispensed By</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {dispenses.map((d) => (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-800)' }}>
                    {d.dispenseCode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{d.patientId?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.patientId?.patientCode}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {d.items?.map((it, i) => (
                      <div key={i} style={{ fontSize: '0.8rem' }}>
                        • {it.medicineName} x {it.quantity} (Batch: {it.batchNumber})
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                    ₹{d.totalAmount.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{d.dispensedBy?.name || 'Pharmacist'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispense Modal */}
      {dispenseModalOpen && (
        <Modal
          isOpen={dispenseModalOpen}
          onClose={() => setDispenseModalOpen(false)}
          title="Dispense Prescription Medications"
          maxWidth="640px"
        >
          <form onSubmit={handleDispenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CustomSelect
              label="Select Patient"
              required
              options={patientOptions}
              value={selectedPatientId}
              onChange={(val) => setSelectedPatientId(val)}
              placeholder="Search or choose patient..."
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Medication Items:</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  + Add Another Medicine
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dispenseItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={item.medicineId}
                      onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                      required
                      style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choose Medicine --</option>
                      {medicines.map((m) => (
                        <option key={m._id} value={m._id} disabled={m.stockQuantity <= 0}>
                          {m.name} (Stock: {m.stockQuantity}) - ₹{m.unitPrice}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                      style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                    />

                    {dispenseItems.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Remarks / Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Advised twice daily after meals"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setDispenseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingDispense}>
                {savingDispense ? 'Dispensing...' : 'Confirm Dispensing & Update Stock'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Batch Modal */}
      {batchModalOpen && activeMedForBatch && (
        <Modal
          isOpen={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          title={`Add Stock Batch • ${activeMedForBatch.name}`}
          maxWidth="500px"
        >
          <form onSubmit={handleAddBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Batch Number <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. B-2026-X01"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Expiry Date <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Quantity Units <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={batchQty}
                onChange={(e) => setBatchQty(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Purchase Price per Unit (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setBatchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add to Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

