import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { Challan, Customer, Product } from '../types';
import Banner from '../components/Banner';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

interface LineItem {
  productId: string;
  quantity: string;
}

export default function ChallanForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingChallan, setExistingChallan] = useState<Challan | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '1' }]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get('/customers', { params: { pageSize: 200, status: 'ACTIVE' } }).then((res) => setCustomers(res.data.data));
    api.get('/products', { params: { pageSize: 200 } }).then((res) => setProducts(res.data.data));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/challans/${id}`)
      .then((res) => {
        const challan: Challan = res.data.data;
        setExistingChallan(challan);
        setCustomerId(challan.customerId);
        setItems(challan.items.map((i) => ({ productId: i.productId, quantity: String(i.quantity) })));
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const isReadOnly = existingChallan ? existingChallan.status !== 'DRAFT' : false;

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: '1' }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  async function handleSaveDraft() {
    setError('');
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setError('Add at least one product line');
      return;
    }

    setSaving(true);
    const payload = {
      customerId,
      items: validItems.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
    };
    try {
      if (isEditing && id) {
        await api.put(`/challans/${id}`, payload);
        navigate(`/challans/${id}`);
      } else {
        const res = await api.post('/challans', payload);
        navigate(`/challans/${res.data.data.id}`);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmChallan() {
    if (!id) return;
    setConfirming(true);
    setError('');
    try {
      const res = await api.post(`/challans/${id}/confirm`);
      setExistingChallan(res.data.data);
      setShowConfirmDialog(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setShowConfirmDialog(false);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <div className="page loading-state">Loading challan...</div>;

  return (
    <div className="page">
      <p>
        <Link to="/challans">&larr; Back to challans</Link>
      </p>
      <div className="page-header">
        <div>
          <h1>{isEditing ? existingChallan?.challanNumber ?? 'Challan' : 'New challan'}</h1>
          <p className="page-subtitle">
            {isEditing && existingChallan ? (
              <>
                <StatusBadge status={existingChallan.status} /> · {existingChallan.customer?.name}
              </>
            ) : (
              'Select a customer and add products'
            )}
          </p>
        </div>
        {isEditing && existingChallan?.status === 'DRAFT' && (
          <button className="btn" onClick={() => setShowConfirmDialog(true)}>
            Confirm challan
          </button>
        )}
      </div>

      <Banner type="error" message={error} />

      <div className="card">
        <div className="form-field" style={{ maxWidth: 360, marginBottom: 20 }}>
          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={isReadOnly}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="section-title">Line items</div>
        <table className="line-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Unit price</th>
              <th>Quantity</th>
              <th>Available stock</th>
              {!isReadOnly && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const product = productMap.get(item.productId);
              return (
                <tr key={index}>
                  <td>
                    {isReadOnly ? (
                      existingChallan?.items[index]?.productNameSnapshot ?? product?.name
                    ) : (
                      <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)}>
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {product ? `₹${Number(product.unitPrice).toFixed(2)}` : existingChallan
                      ? `₹${Number(existingChallan.items[index]?.unitPriceSnapshot ?? 0).toFixed(2)}`
                      : '-'}
                  </td>
                  <td>
                    {isReadOnly ? (
                      item.quantity
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    )}
                  </td>
                  <td className={product && product.currentStock < Number(item.quantity) ? 'form-error' : ''}>
                    {product ? product.currentStock : '-'}
                  </td>
                  {!isReadOnly && (
                    <td>
                      {items.length > 1 && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeItem(index)}>
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {!isReadOnly && (
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={addItem}>
            + Add product line
          </button>
        )}

        <div className="text-right" style={{ marginTop: 16, fontWeight: 600 }}>
          Total quantity: {totalQuantity}
        </div>

        {!isReadOnly && (
          <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 20, marginBottom: 0 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/challans')}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveDraft} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save draft' : 'Create draft challan'}
            </button>
          </div>
        )}

        {isReadOnly && (
          <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
            This challan is {existingChallan?.status.toLowerCase()} and can no longer be edited. Line items shown
            above reflect the product snapshot captured when this challan was created.
          </p>
        )}
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          title="Confirm challan"
          message="This will validate stock for every line item and, if sufficient, reduce stock and mark the challan as Confirmed. This cannot be undone."
          confirmLabel={confirming ? 'Confirming...' : 'Confirm challan'}
          onConfirm={handleConfirmChallan}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}
    </div>
  );
}
