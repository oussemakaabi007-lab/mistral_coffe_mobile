import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../api/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fondDeCaisse, setFondDeCaisse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'LOGIN' | 'FOND_DE_CAISSE'>('LOGIN');
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const showFeedback = (title: string, message: string, type: 'success' | 'error') => {
    setFeedback({ visible: true, title, message, type });
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showFeedback('Erreur', 'Veuillez remplir tous les champs', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/auth/login', { 
        nomUtilisateur: username, 
        motDePasse: password 
      });
      
      const user = response.data.user;
      
      if (user.role !== 'SERVEUR') {
        showFeedback('Accès refusé', 'Seuls les serveurs peuvent se connecter.', 'error');
        setLoading(false);
        return;
      }

      await SecureStore.setItemAsync('userToken', response.data.access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));
      setStep('FOND_DE_CAISSE');
    } catch (error) {
      showFeedback('Erreur', 'Identifiants invalides', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNewSession = async () => {
    try {
      const response = await api.post('/sessions-poste/ouvrir', { 
        fondDeCaisse: parseFloat(fondDeCaisse),
        type: new Date().getHours() < 12 ? 'AVANT_MIDI' : 'APRES_MIDI'
      });
      await SecureStore.setItemAsync('sessionId', response.data.id.toString());
      router.replace('/Dashboard');
    } catch (error) {
      showFeedback('Erreur', 'Impossible d\'ouvrir la session', 'error');
    }
  };

  const handleFinalize = async () => {
    if (!fondDeCaisse) {
      showFeedback('Erreur', 'Le fond de caisse est obligatoire', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const activeSessionRes = await api.get('/sessions-poste/active');
      const activeSession = Array.isArray(activeSessionRes.data) ? activeSessionRes.data[0] : activeSessionRes.data;

      if (activeSession && activeSession.id) {
        await api.patch(`/sessions-poste/${activeSession.id}/cloturer`, { montantFinal: 0 });
        await openNewSession();
      } else {
        await openNewSession();
      }
    } catch (error) {
      await openNewSession();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Café Mistral</Text>
      
      {step === 'LOGIN' ? (
        <View>
          <TextInput 
            style={styles.input} 
            placeholder="Nom d'utilisateur" 
            placeholderTextColor="#8C5832"
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize="none" 
          />
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Mot de passe" 
              placeholderTextColor="#8C5832"
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff color="#8C5832" size={24} />
              ) : (
                <Eye color="#8C5832" size={24} />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connexion</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.subtitle}>Saisir le fond de caisse</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.000"
            placeholderTextColor="#8C5832"
            value={fondDeCaisse} 
            onChangeText={setFondDeCaisse} 
            keyboardType="numeric" 
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleFinalize} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ouvrir la session</Text>}
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={!!feedback} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackBox}>
            <Text style={styles.modalTitle}>{feedback?.title}</Text>
            <Text style={styles.feedbackMessage}>{feedback?.message}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setFeedback(null)}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F4EFE6' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#3E2723' },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#5D4037' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#D9CFC1', color: '#3E2723' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#D9CFC1', paddingRight: 10 },
  passwordInput: { flex: 1, padding: 15, color: '#3E2723' },
  button: { backgroundColor: '#8C5832', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  feedbackBox: { width: '80%', backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  feedbackMessage: { textAlign: 'center', marginBottom: 20 },
  modalBtn: { backgroundColor: '#8C5832', padding: 10, paddingHorizontal: 40, borderRadius: 10 }
});