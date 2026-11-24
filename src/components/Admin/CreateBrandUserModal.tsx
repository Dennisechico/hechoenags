import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandCategory } from '../../types';
import {
  X,
  KeyRound,
  Building2,
  User,
  Package,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react';

interface CreateBrandUserModalProps {
  onClose: () => void;
  onSuccess: (newUserId: string) => void;
}

const CATEGORIES: BrandCategory[] = [
  'Alimentos & Dulces Típicos',
  'Café de Especialidad',
  'Cervecería & Vinos Artesanales',
  'Cosmética Natural & Bienestar',
  'Textil & Confección de Tradición',
  'Artesanías & Cerámica',
  'Joyería & Marroquinería',
];

const MUNICIPALITIES = [
  'Aguascalientes (Centro)',
  'Aguascalientes (San Marcos)',
  'Calvillo, Ags',
  'San José de Gracia / Sierra Fría',
  'Rincón de Romos, Ags',
  'Pabellón de Arteaga, Ags',
  'Jesús María, Ags',
  'Real de Asientos, Ags',
];

export const CreateBrandUserModal: React.FC<CreateBrandUserModalProps> = ({ onClose, onSuccess }) => {
  const { createBrandUser, impersonateUser } = useApp();

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<BrandCategory>('Alimentos & Dulces Típicos');
  const [originLocation, setOriginLocation] = useState('Aguascalientes (San Marcos)');
  const [address, setAddress] = useState('');
  const [rfc, setRfc] = useState('');

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [monthlyFee, setMonthlyFee] = useState(1200);

  // Multiple Products List
  const [productsList, setProductsList] = useState<
    { id: string; name: string; flavor: string; barcode: string; unit: string; costPrice: number; retailPrice: number; initialStock: number }[]
  >([
    {
      id: 'prod-1',
      name: '',
      flavor: '',
      barcode: '',
      unit: 'pza',
      costPrice: 65,
      retailPrice: 110,
      initialStock: 40,
    },
  ]);

  const handleAddProductRow = () => {
    setProductsList((prev) => [
      ...prev,
      {
        id: `prod-${Date.now()}-${prev.length + 1}`,
        name: '',
        flavor: '',
        barcode: '',
        unit: 'pza',
        costPrice: 60,
        retailPrice: 100,
        initialStock: 30,
      },
    ]);
  };

  const handleRemoveProductRow = (id: string) => {
    if (productsList.length <= 1) return;
    setProductsList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleProductChange = (
    id: string,
    field: 'name' | 'flavor' | 'barcode' | 'unit' | 'costPrice' | 'retailPrice' | 'initialStock',
    value: string | number
  ) => {
    setProductsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Status / Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    brandName: string;
    username: string;
    password: string;
    userId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate a secure memorable password
  const generatePassword = () => {
    const prefixes = ['ags', 'hidro', 'marca', 'artesanal', 'fria', 'calvillo'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const newPass = `${randomPrefix}${randomNumber}`;
    setPassword(newPass);
  };

  const handleBrandNameChange = (val: string) => {
    setBrandName(val);
    if (!username || username === brandName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setUsername(val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Debes especificar el usuario y la contraseña para la marca.');
      return;
    }
    if (!brandName.trim()) {
      setErrorMsg('El nombre de la marca local es obligatorio.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMsg('El nombre de la persona titular o emprendedora es obligatorio.');
      return;
    }

    const validProducts = productsList
      .filter((p) => p.name.trim().length > 0)
      .map((p) => ({
        name: p.name.trim(),
        flavor: p.flavor.trim() || 'Original',
        barcode: p.barcode.trim() || undefined,
        description: `Producto de ${brandName} elaborado artesanalmente en ${originLocation}`,
        unit: p.unit || 'pza',
        costPrice: Number(p.costPrice) || 50,
        suggestedRetailPrice: Number(p.retailPrice) || 90,
        centralWarehouseStock: Number(p.initialStock) || 30,
      }));

    const result = createBrandUser({
      username,
      password,
      name: contactName,
      email: email || `${username}@hechoenags.mx`,
      phone: phone || '449-000-0000',
      brandName,
      tagline: tagline || `Orgullo de Aguascalientes - ${category}`,
      category,
      originLocation,
      address: address || `${originLocation}, Aguascalientes, México`,
      rfc,
      monthlyFee,
      initialProducts: validProducts.length > 0 ? validProducts : undefined,
    });

    if (result.success && result.userId) {
      setCreatedSummary({
        brandName,
        username,
        password,
        userId: result.userId,
      });
    } else {
      setErrorMsg(result.message);
    }
  };

  const copyCredentials = () => {
    if (!createdSummary) return;
    const msg = `¡Bienvenido(a) a la plataforma Hecho en Ags!\nTus accesos creados por la Administración para ${createdSummary.brandName}:\n- Usuario: ${createdSummary.username}\n- Contraseña: ${createdSummary.password}\n- URL: Plataforma Logística Colaborativa`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBFD] px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">Alta de Nueva Marca</h2>
                <span className="text-[10px] bg-[#D4F63D] text-slate-900 font-black px-2 py-0.5 rounded-full shrink-0">
                  Administración
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Crea el usuario y contraseña para el nuevo emprendedor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen after creation */}
        {createdSummary ? (
          <div className="p-6 sm:p-8 space-y-6 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">¡Marca y Credenciales Creadas!</h3>
              <p className="text-sm text-slate-600 mt-1">
                La Administración ha dado de alta a <strong className="text-orange-600">{createdSummary.brandName}</strong>. La marca ya puede iniciar sesión con sus credenciales.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-[#FAFBFD] border border-slate-200 rounded-2xl p-5 text-left max-w-md mx-auto space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Credenciales Asignadas
                </span>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado al portapapeles' : 'Copiar para WhatsApp'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-mono">USUARIO:</span>
                  <span className="font-mono text-sm font-bold text-slate-900 select-all bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                    {createdSummary.username}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono">CONTRASEÑA:</span>
                  <span className="font-mono text-sm font-extrabold text-orange-600 select-all bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                    {createdSummary.password}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                🔐 <strong>Importante:</strong> Por seguridad, la contraseña se cifra en un solo sentido (SHA-256). Cópiala ahora para enviarla a la marca; después de cerrar esta ventana no podrá volver a leerse (solo restablecerse con una temporal).
              </p>

              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                🔒 Aislamiento multi-tenant activo: Esta marca solo verá sus propios inventarios consignados y remisiones de entrega.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  impersonateUser(createdSummary.userId);
                  onSuccess(createdSummary.userId);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
              >
                <span>Entrar como {createdSummary.brandName} (Auditado)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onSuccess(createdSummary.userId);
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Permanecer como Administrador
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: User Credentials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-orange-500" /> 1. Credenciales para Iniciar Sesión
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Sparkles className="w-3 h-3" /> Generar contraseña segura
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario / Username <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. mielcalvillo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Sin espacios ni acentos. Usado en la pantalla de inicio de sesión.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 4 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Se almacenará cifrada (SHA-256); compártela al finalizar el registro.
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Brand Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-500" /> 2. Ficha de la Marca Local
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la Marca <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Miel de Azahar & Mezquite Calvillo"
                    value={brandName}
                    onChange={(e) => handleBrandNameChange(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giro / Categoría <span className="text-orange-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BrandCategory)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Municipio / Zona de Origen
                  </label>
                  <select
                    value={originLocation}
                    onChange={(e) => setOriginLocation(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none font-medium"
                  >
                    {MUNICIPALITIES.map((mun) => (
                      <option key={mun} value={mun}>
                        {mun}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lema o Breve Descripción
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Cosechada en colmenas tradicionales hidrocálidas"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    RFC o Clave Fiscal (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. MMC240815AG9"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono uppercase focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Contact & Logistics Plan */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-500" /> 3. Contacto y Suscripción Mensual
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Emprendedor(a) <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Lic. Lorena Medina"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="449-123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cuota Mensual (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Rutas compartidas fijas</span>
                </div>
              </div>
            </div>

            {/* Step 4: Catálogo de Productos de la Marca */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-orange-500" /> 4. Catálogo de Productos de la Marca ({productsList.length})
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Registra los productos que la marca venderá en los anaqueles compartidos de Aguascalientes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddProductRow}
                  className="self-start sm:self-auto px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600" />
                  <span>+ Agregar otro producto</span>
                </button>
              </div>

              {/* Dynamic product list */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {productsList.map((prod, index) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 space-y-2.5 relative group hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider bg-orange-100/60 px-2 py-0.5 rounded-md">
                        Producto #{index + 1}
                      </span>
                      {productsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProductRow(prod.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar este producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nombre del Producto <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder={index === 0 ? "ej. Miel de Mezquite 350g" : "ej. Miel de Azahar 250g"}
                          value={prod.name}
                          onChange={(e) => handleProductChange(prod.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Sabor / Variante
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Natural, Fresa..."
                          value={prod.flavor}
                          onChange={(e) => handleProductChange(prod.id, 'flavor', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Unidad
                        </label>
                        <input
                          type="text"
                          placeholder="pza, frasco"
                          value={prod.unit}
                          onChange={(e) => handleProductChange(prod.id, 'unit', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Cód. Barras / QR
                        </label>
                        <input
                          type="text"
                          placeholder="750... (auto)"
                          value={prod.barcode}
                          onChange={(e) => handleProductChange(prod.id, 'barcode', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Costo Consig. ($)
                        </label>
                        <input
                          type="number"
                          value={prod.costPrice}
                          onChange={(e) => handleProductChange(prod.id, 'costPrice', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Stock Bodega Inicial (pzas)
                        </label>
                        <input
                          type="number"
                          value={prod.initialStock}
                          onChange={(e) => handleProductChange(prod.id, 'initialStock', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another product button directly under list */}
              <button
                type="button"
                onClick={handleAddProductRow}
                className="w-full py-2.5 border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/40 hover:bg-orange-50/80 text-orange-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <span>+ Agregar otro producto a esta marca</span>
              </button>
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-orange-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" /> Guardar Marca y Generar Acceso
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
