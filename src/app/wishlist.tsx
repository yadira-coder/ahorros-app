import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings, WishlistItem } from '@/context/SavingsContext';
import { Header } from '@/components/Header';
import { customAlert, customConfirm } from '@/utils/alert';
import { parseFormattedAmount } from '@/utils/format';

export default function WishlistScreen() {
  const {
    wishlist,
    totalWishlistAmount,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    toggleWishlistPurchased,
    categoryBudgets,
    createGoalFromWishlist,
    plannedExpenses,
  } = useSavings();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [details, setDetails] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedCategory, setSelectedCategory] = useState<string>('shopping');
  const [targetMonths, setTargetMonths] = useState<number>(3);

  // Filter tab state
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'purchased'>('pending');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setPrice('');
    setDetails('');
    setUrl('');
    setPriority('medium');
    setSelectedCategory('shopping');
    setTargetMonths(3);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: WishlistItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setPrice(item.price.toString());
    setDetails(item.details || '');
    setUrl(item.url || '');
    setPriority(item.priority || 'medium');
    setSelectedCategory(item.category || 'shopping');
    setTargetMonths(item.targetMonths || 3);
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    const numPrice = parseFormattedAmount(price);
    if (!title.trim() || numPrice <= 0) {
      customAlert('Error', 'Por favor introduce un título y un precio válido.');
      return;
    }

    let cleanUrl = url.trim();
    if (cleanUrl && !cleanUrl.match(/^https?:\/\//i)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (editingItem) {
      await updateWishlistItem(editingItem.id, {
        title: title.trim(),
        price: numPrice,
        details: details.trim(),
        url: cleanUrl,
        priority,
        category: selectedCategory,
        targetMonths,
      });
    } else {
      await addWishlistItem({
        title: title.trim(),
        price: numPrice,
        details: details.trim(),
        url: cleanUrl,
        priority,
        category: selectedCategory,
        targetMonths,
        isPurchased: false,
      });
    }

    setModalVisible(false);
  };

  const handleCreateHucha = async (item: WishlistItem) => {
    const months = item.targetMonths || 3;
    await createGoalFromWishlist(item, months);
    customAlert(
      '🐷 ¡Hucha Creada!',
      `Se ha añadido "${item.title}" a tus Huchas con el objetivo de ${formatCurrency(item.price)} (${formatCurrency(Math.ceil(item.price / months))}/mes en ${months} meses).`
    );
  };

  const handleDeleteItem = (item: WishlistItem) => {
    customConfirm(
      'Eliminar Deseo',
      `¿Estás seguro de que deseas eliminar "${item.title}" de tu lista de deseos?`,
      async () => {
        await deleteWishlistItem(item.id);
      }
    );
  };

  const handleOpenUrl = (rawUrl?: string) => {
    if (!rawUrl) return;
    let target = rawUrl.trim();
    if (!target.match(/^https?:\/\//i)) {
      target = `https://${target}`;
    }
    Linking.openURL(target).catch(() => {
      customAlert('Error de Enlace', 'No se pudo abrir el enlace especificado.');
    });
  };

  // Filter items
  const filteredWishlist = wishlist.filter((item) => {
    if (activeFilter === 'pending') return !item.isPurchased;
    if (activeFilter === 'purchased') return item.isPurchased;
    return true;
  });

  const pendingCount = wishlist.filter((w) => !w.isPurchased).length;
  const purchasedCount = wishlist.filter((w) => w.isPurchased).length;

  const getPriorityBadge = (p?: 'low' | 'medium' | 'high') => {
    switch (p) {
      case 'high':
        return { label: 'Alta Prioridad', bg: 'rgba(242, 132, 130, 0.2)', color: '#ba1a1a' };
      case 'low':
        return { label: 'Baja Prioridad', bg: 'rgba(132, 165, 157, 0.2)', color: '#504442' };
      case 'medium':
      default:
        return { label: 'Prioridad Normal', bg: 'rgba(178, 112, 146, 0.18)', color: '#b27092' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Decorative Blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleIconRow}>
            <View style={styles.headerIconBg}>
              <MaterialIcons name="favorite" size={26} color="#b27092" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pageTitle}>Lista de Deseos</Text>
              <Text style={styles.pageSubtitle}>Guarda tus caprichos, precios y enlaces directos</Text>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryGlassCard}>
          <View style={styles.summaryMainRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Coste Total Pendiente</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalWishlistAmount)}</Text>
            </View>

            <View style={styles.summaryPillsCol}>
              <View style={styles.statPill}>
                <MaterialIcons name="pending-actions" size={14} color="#775651" />
                <Text style={styles.statPillText}>{pendingCount} pendientes</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: 'rgba(132, 165, 157, 0.15)', marginTop: 6 }]}>
                <MaterialIcons name="check-circle" size={14} color="#84a59d" />
                <Text style={[styles.statPillText, { color: '#84a59d' }]}>{purchasedCount} conseguidos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Smart Purchase Plan Card (Based on category budgets & planned expenses) */}
        {pendingCount > 0 && (() => {
          const shoppingCat = categoryBudgets.find(
            (c) => c.category === 'shopping' || c.name.toLowerCase().includes('compras')
          );
          const shoppingLimit = shoppingCat ? shoppingCat.limit : 120;
          const shoppingSpent = shoppingCat ? shoppingCat.spent : 0;
          const shoppingAvailable = Math.max(0, shoppingLimit - shoppingSpent);

          const pendingItems = wishlist
            .filter((w) => !w.isPurchased)
            .sort((a, b) => {
              const prioMap = { high: 1, medium: 2, low: 3 };
              return (prioMap[a.priority || 'medium'] || 2) - (prioMap[b.priority || 'medium'] || 2);
            });

          // Multi-product packing algorithm
          let accumulatedPrice = 0;
          const affordableBasket: WishlistItem[] = [];
          const remainingItems: WishlistItem[] = [];

          for (const item of pendingItems) {
            if (accumulatedPrice + item.price <= shoppingAvailable) {
              accumulatedPrice += item.price;
              affordableBasket.push(item);
            } else {
              remainingItems.push(item);
            }
          }

          // Check planned expenses for favorable months
          const upcomingPlanned = plannedExpenses.filter((p) => p.amount > 0);
          let favorableMessage = '';
          if (upcomingPlanned.length > 0) {
            const exp = upcomingPlanned[0];
            favorableMessage = `💡 El mes actual es más favorable para realizar compras que ${exp.targetMonth}, ya que en ese mes tienes el gasto previsto "${exp.title}" (${formatCurrency(exp.amount)}).`;
          }

          return (
            <View style={styles.plannerGlassCard}>
              <View style={styles.plannerHeader}>
                <MaterialIcons name="auto-awesome" size={20} color="#b27092" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.plannerTitle}>Plan Inteligente de Compras</Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442', marginTop: 1 }}>
                    Presupuesto Compras: {formatCurrency(shoppingAvailable)} disponible (Límite: {formatCurrency(shoppingLimit)}/mes)
                  </Text>
                </View>
              </View>

              <View style={styles.planSection}>
                {affordableBasket.length > 0 ? (
                  <View>
                    <Text style={styles.planSectionTitle}>🛍️ Cesta de Compras Sugerida ({affordableBasket.length} productos)</Text>
                    <Text style={styles.planText}>
                      ¡Buenas noticias! Con tu presupuesto de <Text style={styles.boldText}>Compras ({formatCurrency(shoppingAvailable)})</Text>, este mes puedes comprar juntos:{' '}
                      <Text style={styles.boldText}>
                        {affordableBasket.map((i) => `"${i.title}" (${formatCurrency(i.price)})`).join(', ')}
                      </Text>{' '}
                      por un total de <Text style={styles.boldText}>{formatCurrency(accumulatedPrice)}</Text>.
                    </Text>
                    <Text style={[styles.planText, { marginTop: 4, color: '#84a59d', fontWeight: '600' }]}>
                      Te quedarán {formatCurrency(shoppingAvailable - accumulatedPrice)} libres en la categoría Compras.
                    </Text>

                    {remainingItems.length > 0 && (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(178, 112, 146, 0.15)' }}>
                        <Text style={styles.planSectionTitle}>🗓️ Para los demás deseos pendientes:</Text>
                        <Text style={styles.planText}>
                          Para <Text style={styles.boldText}>"{remainingItems[0].title}"</Text> ({formatCurrency(remainingItems[0].price)}), te aconsejamos reservar cuotas con los {formatCurrency(shoppingLimit)}/mes de Compras en los siguientes meses.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.planSectionTitle}>🗓️ Plan por Cuotas Mensuales (Categoría Compras)</Text>
                    <Text style={styles.planText}>
                      Para el producto principal <Text style={styles.boldText}>"{pendingItems[0].title}"</Text> ({formatCurrency(pendingItems[0].price)}), te recomendamos reservar{' '}
                      <Text style={styles.boldText}>{formatCurrency(Math.ceil(pendingItems[0].price / (pendingItems[0].targetMonths || 3)))}/mes</Text> de tu categoría Compras durante <Text style={styles.boldText}>{pendingItems[0].targetMonths || 3} meses</Text>.
                    </Text>
                  </View>
                )}

                {favorableMessage ? (
                  <View style={{ marginTop: 10, backgroundColor: 'rgba(246, 189, 96, 0.15)', padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#775651', lineHeight: 17 }}>{favorableMessage}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })()}

        {/* Filter Selector */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'pending' && styles.filterChipActive]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'pending' && styles.filterChipTextActive]}>
              Pendientes ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              Todos ({wishlist.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'purchased' && styles.filterChipActive]}
            onPress={() => setActiveFilter('purchased')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'purchased' && styles.filterChipTextActive]}>
              Conseguidos ({purchasedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wishlist Items List */}
        {filteredWishlist.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="favorite-border" size={48} color="#b27092" />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'purchased'
                ? 'Aún no has marcado deseos como conseguidos'
                : 'Tu lista de deseos está vacía'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Toca el botón con el icono + para añadir tu primer deseo o producto guardado.
            </Text>
          </View>
        ) : (
          filteredWishlist.map((item) => {
            const priorityBadge = getPriorityBadge(item.priority);

            return (
              <View
                key={item.id}
                style={[
                  styles.wishlistCard,
                  item.isPurchased && styles.wishlistCardPurchased,
                ]}
              >
                <View style={styles.cardHeader}>
                  {/* Heart / Purchased Checkbox */}
                  <TouchableOpacity
                    onPress={() => toggleWishlistPurchased(item.id)}
                    style={[
                      styles.heartBtn,
                      item.isPurchased && styles.heartBtnPurchased,
                    ]}
                  >
                    <MaterialIcons
                      name={item.isPurchased ? 'favorite' : 'favorite-border'}
                      size={22}
                      color={item.isPurchased ? '#ffffff' : '#b27092'}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <Text
                      style={[
                        styles.itemTitle,
                        item.isPurchased && styles.itemTitlePurchased,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityBadge.bg }]}>
                        <Text style={[styles.priorityBadgeText, { color: priorityBadge.color }]}>
                          {priorityBadge.label}
                        </Text>
                      </View>
                      {(() => {
                        const cat = categoryBudgets.find((c) => c.category === item.category);
                        const catName = cat ? cat.name : 'Compras';
                        return (
                          <View style={{ backgroundColor: 'rgba(119, 86, 81, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: '#775651' }}>
                              🏷️ {catName}
                            </Text>
                          </View>
                        );
                      })()}
                      {item.isPurchased && (
                        <View style={styles.purchasedBadge}>
                          <Text style={styles.purchasedBadgeText}>💖 ¡Conseguido!</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.itemPrice,
                      item.isPurchased && styles.itemPricePurchased,
                    ]}
                  >
                    {formatCurrency(item.price)}
                  </Text>
                </View>

                {/* Details Section */}
                {!!item.details && (
                  <Text style={styles.itemDetails} numberOfLines={3}>
                    {item.details}
                  </Text>
                )}

                {/* Auto Hucha Proposal (> 100€) */}
                {!item.isPurchased && item.price > 100 && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(178, 112, 146, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(178, 112, 146, 0.3)',
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginTop: 8,
                      gap: 6,
                    }}
                    onPress={() => handleCreateHucha(item)}
                  >
                    <MaterialIcons name="savings" size={16} color="#b27092" />
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#b27092' }}>
                      🐷 Crear Hucha ({formatCurrency(Math.ceil(item.price / (item.targetMonths || 3)))}/mes en {item.targetMonths || 3} meses)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Action Links & Buttons */}
                <View style={styles.cardFooter}>
                  {!!item.url ? (
                    <TouchableOpacity
                      style={styles.urlBtn}
                      onPress={() => handleOpenUrl(item.url)}
                    >
                      <MaterialIcons name="open-in-new" size={16} color="#775651" />
                      <Text style={styles.urlBtnText} numberOfLines={1}>
                        Ver Enlace del Producto
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  <View style={styles.actionBtnsRow}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(item)}
                      style={styles.actionIconBtn}
                    >
                      <MaterialIcons name="edit" size={18} color="#504442" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      style={styles.actionIconBtn}
                    >
                      <MaterialIcons name="delete" size={18} color="#ba1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button (FAB) */}
      <TouchableOpacity style={styles.fabBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal - Añadir / Editar Deseo */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Editar Deseo' : 'Añadir Nuevo Deseo'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalForm}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Product Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre del Producto / Capricho</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. Zapatillas de Running, Reloj Inteligente..."
                  placeholderTextColor="#efe6e5"
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                />
              </View>

              {/* Price */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Precio Estimado (€)</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderWidth: 0 }]}
                    placeholder="89,99"
                    placeholderTextColor="#efe6e5"
                    keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                    inputMode="decimal"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              {/* URL */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Enlace Web / URL (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://tienda.com/producto..."
                  placeholderTextColor="#efe6e5"
                  keyboardType="url"
                  autoCapitalize="none"
                  value={url}
                  onChangeText={setUrl}
                />
              </View>

              {/* Category Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Categoría Asociada</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {categoryBudgets.map((cat) => {
                    const isSelected = selectedCategory === cat.category;
                    return (
                      <TouchableOpacity
                        key={cat.category}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? '#b27092' : 'rgba(80, 68, 66, 0.15)',
                          backgroundColor: isSelected ? 'rgba(178, 112, 146, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                          gap: 6,
                        }}
                        onPress={() => setSelectedCategory(cat.category)}
                      >
                        <MaterialIcons name={cat.icon as any} size={16} color={isSelected ? '#b27092' : '#504442'} />
                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: isSelected ? '#b27092' : '#504442', fontWeight: isSelected ? '700' : '400' }}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Timeframe Horizon Selector (¿En cuántos meses te gustaría comprarlo?) */}
              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Plazo deseado para conseguirlo</Text>
                  {parseFormattedAmount(price) > 0 && (
                    <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: '#b27092' }}>
                      {formatCurrency(Math.ceil(parseFormattedAmount(price) / targetMonths))}/mes
                    </Text>
                  )}
                </View>

                <View style={styles.prioritySelector}>
                  {[1, 2, 3, 6, 12].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.priorityOption,
                        targetMonths === m && { backgroundColor: 'rgba(178, 112, 146, 0.25)', borderColor: '#b27092' },
                      ]}
                      onPress={() => setTargetMonths(m)}
                    >
                      <Text style={[styles.priorityOptionText, targetMonths === m && { color: '#b27092', fontWeight: '700' }]}>
                        {m} {m === 1 ? 'mes' : 'meses'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Prioridad de Compra</Text>
                <View style={styles.prioritySelector}>
                  <TouchableOpacity
                    style={[
                      styles.priorityOption,
                      priority === 'low' && { backgroundColor: 'rgba(132, 165, 157, 0.25)', borderColor: '#84a59d' },
                    ]}
                    onPress={() => setPriority('low')}
                  >
                    <Text style={[styles.priorityOptionText, priority === 'low' && { color: '#504442', fontWeight: '700' }]}>
                      Baja
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.priorityOption,
                      priority === 'medium' && { backgroundColor: 'rgba(178, 112, 146, 0.25)', borderColor: '#b27092' },
                    ]}
                    onPress={() => setPriority('medium')}
                  >
                    <Text style={[styles.priorityOptionText, priority === 'medium' && { color: '#b27092', fontWeight: '700' }]}>
                      Media
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.priorityOption,
                      priority === 'high' && { backgroundColor: 'rgba(242, 132, 130, 0.25)', borderColor: '#f28482' },
                    ]}
                    onPress={() => setPriority('high')}
                  >
                    <Text style={[styles.priorityOptionText, priority === 'high' && { color: '#ba1a1a', fontWeight: '700' }]}>
                      Alta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Details / Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Detalles / Notas adicionales (Opcional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="ej. Talla 39, color blanco, esperar a rebajas de verano..."
                  placeholderTextColor="#efe6e5"
                  multiline
                  numberOfLines={3}
                  value={details}
                  onChangeText={setDetails}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveBtnText}>
                  {editingItem ? 'Guardar Cambios' : 'Añadir a Lista de Deseos'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7ede2',
  },
  blob1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(178, 112, 146, 0.12)',
    zIndex: -1,
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(245, 202, 195, 0.15)',
    zIndex: -1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(178, 112, 146, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  pageSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 2,
  },
  summaryGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
    shadowColor: '#b27092',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '700',
    color: '#b27092',
    marginTop: 4,
  },
  summaryPillsCol: {
    alignItems: 'flex-end',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(119, 86, 81, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#775651',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#b27092',
    borderColor: '#b27092',
  },
  filterChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#504442',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.1)',
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b1a',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  wishlistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#504442',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  wishlistCardPurchased: {
    backgroundColor: 'rgba(244, 236, 235, 0.6)',
    borderColor: 'rgba(132, 165, 157, 0.3)',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(178, 112, 146, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnPurchased: {
    backgroundColor: '#b27092',
  },
  itemTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  itemTitlePurchased: {
    textDecorationLine: 'line-through',
    color: '#504442',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
  },
  purchasedBadge: {
    backgroundColor: 'rgba(132, 165, 157, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  purchasedBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#84a59d',
  },
  itemPrice: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#b27092',
  },
  itemPricePurchased: {
    color: '#84a59d',
  },
  itemDetails: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 10,
    lineHeight: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80, 68, 66, 0.08)',
  },
  urlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(119, 86, 81, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    maxWidth: '65%',
  },
  urlBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#775651',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.1)',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b27092',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#b27092',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f7ede2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 68, 66, 0.1)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  modalForm: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#1e1b1a',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: '#b27092',
    fontWeight: '600',
    marginRight: 6,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  priorityOptionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
  },
  saveBtn: {
    backgroundColor: '#b27092',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#b27092',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  plannerGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(178, 112, 146, 0.25)',
    shadowColor: '#b27092',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(178, 112, 146, 0.15)',
    paddingBottom: 8,
  },
  plannerTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  planSection: {
    gap: 4,
  },
  planSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#b27092',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    lineHeight: 19,
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#1e1b1a',
  },
});
