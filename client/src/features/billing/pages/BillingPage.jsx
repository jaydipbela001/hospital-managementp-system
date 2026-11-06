import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './BillingPage.css';

const CATEGORIES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'LAB', label: 'Laboratory Test' },
  { value: 'PHARMACY', label: 'Pharmacy Medicine' },
  { value: 'ROOM', label: 'Room / Bed Charge' },
  { value: 'PROCEDURE', label: 'Procedure / Surgery' },
  { value: 'OTHER', label: 'Other Service' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card (POS Terminal)' },
  { value: 'UPI', label: 'UPI / QR' },
  { value: 'INSURANCE', label: 'Insurance Claim' },
];

export default function BillingPage() {
  const { user } = useAuth();
  const isCashierOrAdmin = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(user?.role);

  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Invoice Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: 'OPD Doctor Consultation Fee', category: 'CONSULTATION', quantity: 1, unitPrice: 50 },
  ]);

  // Invoice Detail & Payment Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Record Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, patRes] = await Promise.all([
        apiClient('/billing/invoices'),
        apiClient('/patients'),
      ]);
      setInvoices(invRes.data || []);
      setPatients(patRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openInvoiceDetails = async (invoiceId) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const res = await apiClient(`/billing/invoices/${invoiceId}`);
      setActiveInvoice(res.data.invoice);
      setPayments(res.data.payments || []);
      setPaymentAmount(res.data.invoice.balanceAmount || '');
      setTransactionRef('');
      setPaymentNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to load invoice details');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', category: 'OTHER', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const calculatedSubtotal = items.reduce(
    (acc, it) => acc + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
    0
  );
  const calculatedTotal = Math.max(0, calculatedSubtotal - (Number(discount) || 0) + (Number(tax) || 0));

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (items.some((it) => !it.description.trim() || Number(it.unitPrice) < 0)) {
      toast.error('Please provide valid description and unit price for all items');
      return;
    }

    try {
      setSavingInvoice(true);
      await apiClient('/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          items,
          discount: Number(discount) || 0,
          tax: Number(tax) || 0,
          notes,
        }),
      });
      toast.success('Invoice created successfully');
      setCreateModalOpen(false);
      setSelectedPatientId('');
      setNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (amountNum > activeInvoice.balanceAmount) {
      toast.error(`Amount exceeds balance of $${activeInvoice.balanceAmount}`);
      return;
    }

    try {
      setSubmittingPayment(true);
      await apiClient(`/billing/invoices/${activeInvoice._id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod,
          transactionReference: transactionRef,
          notes: paymentNotes,
        }),
      });
      toast.success('Payment recorded successfully');
      await openInvoiceDetails(activeInvoice._id);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: `${p.name} (${p.patientCode || p.phone})`,
  }));

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalBalance = invoices.reduce((acc, inv) => acc + (inv.balanceAmount || 0), 0);

  return (
    <div className="billing-page">
      <PageHeader
        title="Billing & Invoicing"
        subtitle="Consolidated patient journey invoices (OPD, Lab, Meds, IPD) & Cashier Ledger"
        actions={
          isCashierOrAdmin && (
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              + Generate Invoice
            </Button>
          )
        }
      />

      <div className="billing-stats-grid">
        <div className="billing-stat-card">
          <span className="billing-stat-title">Total Invoiced</span>
          <span className="billing-stat-value">${totalInvoiced.toFixed(2)}</span>
        </div>
        <div className="billing-stat-card">
          <span className="billing-stat-title">Total Collected</span>
          <span className="billing-stat-value" style={{ color: '#16a34a' }}>
            ${totalPaid.toFixed(2)}
          </span>
        </div>
        <div className="billing-stat-card">
          <span className="billing-stat-title">Outstanding Balance</span>
          <span className="billing-stat-value" style={{ color: '#dc2626' }}>
            ${totalBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : invoices.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Invoices Found</h3>
          <p>Generate a new invoice to start recording hospital bills.</p>
        </div>
      ) : (
        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td>
                    {inv.patientId?.name || 'Unknown Patient'}
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {inv.patientId?.patientCode || inv.patientId?.phone}
                    </div>
                  </td>
                  <td>${inv.totalAmount.toFixed(2)}</td>
                  <td style={{ color: '#16a34a' }}>${inv.paidAmount.toFixed(2)}</td>
                  <td style={{ color: inv.balanceAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                    ${inv.balanceAmount.toFixed(2)}
                  </td>
                  <td>
                    <Badge
                      variant={
                        inv.status === 'PAID'
                          ? 'success'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline" size="small" onClick={() => openInvoiceDetails(inv._id)}>
                      View & Pay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Generate New Hospital Invoice"
        size="large"
      >
        <form onSubmit={handleCreateInvoice}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Select Patient *
            </label>
            <CustomSelect
              options={patientOptions}
              value={selectedPatientId}
              onChange={setSelectedPatientId}
              placeholder="Search patient by name or code..."
            />
          </div>

          <label style={{ display: 'block', fontWeight: 600, marginTop: '1rem' }}>
            Billable Line Items *
          </label>
          <div className="billing-items-editor">
            {items.map((item, idx) => (
              <div key={idx} className="billing-item-row">
                <input
                  type="text"
                  placeholder="Service / Item Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <select
                  value={item.category}
                  onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '70px' }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '90px' }}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="small"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={handleAddItem}
              style={{ alignSelf: 'flex-start' }}
            >
              + Add Item
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Discount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Tax ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: '6px',
              textAlign: 'right',
            }}
          >
            <div>Subtotal: <strong>${calculatedSubtotal.toFixed(2)}</strong></div>
            <div style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>
              Final Total: <strong style={{ color: '#0284c7' }}>${calculatedTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Follow-up consultation included"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingInvoice}>
              {savingInvoice ? 'Generating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW INVOICE & RECORD PAYMENT MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={activeInvoice ? `Invoice: ${activeInvoice.invoiceNumber}` : 'Invoice Details'}
        size="large"
      >
        {detailLoading || !activeInvoice ? (
          <Loader />
        ) : (
          <div>
            <div className="billing-detail-section">
              <div className="billing-detail-grid">
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Patient</span>
                  <div style={{ fontWeight: 600 }}>{activeInvoice.patientId?.name}</div>
                  <div style={{ fontSize: '0.8rem' }}>{activeInvoice.patientId?.patientCode}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status</span>
                  <div>
                    <Badge
                      variant={
                        activeInvoice.status === 'PAID'
                          ? 'success'
                          : activeInvoice.status === 'PARTIALLY_PAID'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {activeInvoice.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Billed</span>
                  <div style={{ fontWeight: 700 }}>${activeInvoice.totalAmount.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Outstanding Balance</span>
                  <div style={{ fontWeight: 700, color: activeInvoice.balanceAmount > 0 ? '#dc2626' : '#16a34a' }}>
                    ${activeInvoice.balanceAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <h4 style={{ margin: '0.5rem 0 0 0' }}>Billed Items</h4>
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.description}</td>
                      <td>
                        <Badge variant="info">{it.category}</Badge>
                      </td>
                      <td>{it.quantity}</td>
                      <td>${it.unitPrice.toFixed(2)}</td>
                      <td>${it.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payment Receipts */}
              <h4 style={{ margin: '0.5rem 0 0 0' }}>Payment History</h4>
              {payments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No payments recorded yet.</div>
              ) : (
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Method</th>
                      <th>Reference ID</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 600 }}>{p.receiptNumber}</td>
                        <td>
                          <Badge variant="success">{p.paymentMethod}</Badge>
                        </td>
                        <td>{p.transactionReference || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>${p.amount.toFixed(2)}</td>
                        <td>{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Record Payment Form (if balance > 0) */}
              {activeInvoice.balanceAmount > 0 && isCashierOrAdmin && (
                <form
                  onSubmit={handleRecordPayment}
                  style={{
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginTop: '0.5rem',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.75rem 0' }}>Record Payment</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Amount ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={activeInvoice.balanceAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Payment Method *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      Transaction Reference ID (Optional - Cheque / POS Auth / UPI Ref / Claim #)
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI-TXN-12345 or POS-REF-9988"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <Button type="submit" variant="primary" disabled={submittingPayment}>
                      {submittingPayment ? 'Recording...' : `Record Payment of $${Number(paymentAmount || 0).toFixed(2)}`}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

