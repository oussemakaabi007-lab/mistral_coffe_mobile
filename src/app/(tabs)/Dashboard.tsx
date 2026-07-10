import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../api/api';

export default function Dashboard() {
  const [userData, setUserData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.get('/produits'), api.get('/categories')]);
      setProducts(pRes.data.filter((p: any) => p.actif === true));
      setCategories(cRes.data.filter((c: any) => c.actif === true));
    } catch (error) {
      setFeedback({ visible: true, title: 'Erreur', message: 'Impossible de charger les données', type: 'error' });
    }
  };

  useEffect(() => {
    const init = async () => {
      const storedUser = await SecureStore.getItemAsync('userData');
      if (storedUser) setUserData(JSON.parse(storedUser));
      await fetchData();
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) return prev.map((item) => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product, qty: 1 }];
    });
  };

  const confirmCommande = async () => {
    if (!userData || cart.length === 0) return;
    try {
      const activeShift = new Date().getHours() < 12 ? 'AVANT_MIDI' : 'APRES_MIDI';
      await api.post('/ventes/enregistrer-saisie', {
        typePoste: activeShift,
        waiterId: userData.id,
        items: cart.map(item => ({ produitId: item.product.id, quantite: item.qty }))
      });
      setCart([]);
      setIsCartVisible(false);
      setFeedback({ visible: true, title: 'Succès', message: 'Commande enregistrée !', type: 'success' });
    } catch (error) {
      setFeedback({ visible: true, title: 'Erreur', message: 'Impossible de valider.', type: 'error' });
    }
  };

  const filteredData = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCat === null || p.categorieId == selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCat]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8C5832" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Serveur : {userData?.nomUtilisateur}</Text></View>
      
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchBar} placeholder="Rechercher..."   placeholderTextColor="#484343" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        <TouchableOpacity style={[styles.catBtn, selectedCat === null && styles.activeCat]} onPress={() => setSelectedCat(null)}><Text>Tous</Text></TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity key={cat.id} style={[styles.catBtn, selectedCat === cat.id && styles.activeCat]} onPress={() => setSelectedCat(cat.id)}><Text>{cat.nom}</Text></TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.productList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C5832']} />}>
        <View style={styles.grid}>
          {filteredData.map((prod) => (
            <View key={prod.id} style={styles.card}>
              {prod.imageUrl && <Image source={{ uri: prod.imageUrl }} style={styles.image} />}
              <Text style={styles.prodName}>{prod.nom}</Text>
              <Text style={styles.prodPrice}>{prod.prix} DT</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(prod)}><Text style={styles.btnText}>Ajouter</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {cart.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsCartVisible(true)}><Text style={styles.btnText}>Commande ({cart.reduce((a, b) => a + b.qty, 0)})</Text></TouchableOpacity>
      )}
      <Modal visible={isCartVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Commande Actuel</Text>
            {cart.map(item => (
              <View key={item.product.id} style={styles.cartItem}>
                <Text style={styles.cartItemText}>{item.product.nom}</Text>
                <Text style={styles.cartItemQty}>x {item.qty}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmCommande}><Text style={styles.btnText}>Valider Commande</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setIsCartVisible(false)} style={styles.closeBtn}><Text>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!feedback} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModal}>
            <Text style={styles.modalTitle}>{feedback?.title}</Text>
            <Text style={{marginBottom: 20}}>{feedback?.message}</Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setFeedback(null)}><Text style={styles.btnText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4EFE6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, backgroundColor: '#2D1F16', paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  searchContainer: { padding: 10 },
  searchBar: { backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#D9CFC1' },
  catScroll: { flexGrow: 0, paddingHorizontal: 15, marginBottom: 10 },
  catBtn: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#D9CFC1' },
  activeCat: { backgroundColor: '#8C5832', borderColor: '#8C5832' },
  productList: { padding: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', padding: 10, borderRadius: 15, marginBottom: 15 },
  image: { width: '100%', height: 90, borderRadius: 10, marginBottom: 8 },
  prodName: { fontSize: 13, fontWeight: 'bold' },
  prodPrice: { color: '#8C5832', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  addBtn: { backgroundColor: '#2D1F16', padding: 10, marginTop: 10, borderRadius: 8 },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  fab: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#8C5832', padding: 18, borderRadius: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 30, borderRadius: 20 },
  feedbackModal: { width: '80%', backgroundColor: '#fff', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cartItemText: { fontWeight: '600' },
  cartItemQty: { color: '#8C5832', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#8C5832', padding: 15, borderRadius: 10 },
  closeBtn: { marginTop: 15, alignItems: 'center' }
});