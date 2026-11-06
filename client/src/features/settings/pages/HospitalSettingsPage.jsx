import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import { PageHeader, Button, Input, Loader } from '../../../components/common';

export default function HospitalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/hospital');
      if (res?.data) {
        setName(res.data.name || '');
        setTagline(res.data.tagline || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setAddress(res.data.address || '');
        setCurrency(res.data.currency || 'USD');
        setLogoUrl(res.data.logoUrl || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMsg('');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('tagline', tagline);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('currency', currency);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await apiClient('/hospital', { method: 'PUT', body: formData });
      if (res?.data?.logoUrl) {
        setLogoUrl(res.data.logoUrl);
      }
      setStatusMsg('Hospital settings updated successfully!');
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}><Loader /></div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px' }}>
      <PageHeader
        title="Hospital Settings"
        subtitle="Configure primary hospital details, branding, and contact info"
      />

      {statusMsg && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', backgroundColor: statusMsg.startsWith('Error') ? '#fee2e2' : '#dcfce7', color: statusMsg.startsWith('Error') ? '#b91c1c' : '#15803d' }}>
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {logoUrl && (
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Current Logo:</span>
            <img src={`http://localhost:5000${logoUrl}`} alt="Hospital Logo" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
        )}

        <Input label="Hospital Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Caring for you always" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Official Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="Physical Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Currency Code" value={currency} onChange={(e) => setCurrency(e.target.value)} />

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Change Hospital Logo</label>
          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0] || null)} />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

