import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import AddDocumentScreen from '../screens/AddDocumentScreen';
import AuditScreen from '../screens/AuditScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import MyDocumentsScreen from '../screens/MyDocumentsScreen';
import MyPassportScreen from '../screens/MyPassportScreen';
import MyQrScreen from '../screens/MyQrScreen';
import ScanScreen from '../screens/ScanScreen';
import SecurityScreen from '../screens/SecurityScreen';
import SupplierPassportScreen from '../screens/SupplierPassportScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import VerifyResultScreen from '../screens/VerifyResultScreen';
import UsersScreen from '../screens/UsersScreen';
import ReviewQueueScreen from '../screens/ReviewQueueScreen';
import ReviewDocumentScreen from '../screens/ReviewDocumentScreen';
import MfaSetupScreen from '../screens/MfaSetupScreen';
import MfaVerifyScreen from '../screens/MfaVerifyScreen';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(outline, filled) {
  return function renderIcon({ color, size, focused }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };
}

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textLight,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
};

function GestorTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Painel"
        component={DashboardScreen}
        options={{ tabBarIcon: tabIcon('grid-outline', 'grid') }}
      />
      <Tab.Screen
        name="Fornecedores"
        component={SuppliersScreen}
        options={{ tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tab.Screen
        name="Verificar"
        component={ScanScreen}
        options={{ tabBarIcon: tabIcon('qr-code-outline', 'qr-code') }}
      />
      <Tab.Screen
        name="Auditoria"
        component={AuditScreen}
        options={{ tabBarIcon: tabIcon('shield-outline', 'shield') }}
      />
    </Tab.Navigator>
  );
}

function AnalistaTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Análises"
        component={ReviewQueueScreen}
        options={{ tabBarIcon: tabIcon('checkbox-outline', 'checkbox') }}
      />
      <Tab.Screen
        name="Fornecedores"
        component={SuppliersScreen}
        options={{ tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tab.Screen
        name="Verificar"
        component={ScanScreen}
        options={{ tabBarIcon: tabIcon('qr-code-outline', 'qr-code') }}
      />
    </Tab.Navigator>
  );
}

function VerificadorTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Verificar"
        component={ScanScreen}
        options={{ tabBarIcon: tabIcon('qr-code-outline', 'qr-code') }}
      />
    </Tab.Navigator>
  );
}

function AdministradorTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Usuários"
        component={UsersScreen}
        options={{ tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tab.Screen
        name="Auditoria"
        component={AuditScreen}
        options={{ tabBarIcon: tabIcon('shield-outline', 'shield') }}
      />
    </Tab.Navigator>
  );
}

function FornecedorTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Passaporte"
        component={MyPassportScreen}
        options={{ tabBarIcon: tabIcon('id-card-outline', 'id-card') }}
      />
      <Tab.Screen
        name="Documentos"
        component={MyDocumentsScreen}
        options={{ tabBarIcon: tabIcon('documents-outline', 'documents') }}
      />
      <Tab.Screen
        name="QR Code"
        component={MyQrScreen}
        options={{ tabBarIcon: tabIcon('qr-code-outline', 'qr-code') }}
      />
      <Tab.Screen
        name="Segurança"
        component={SecurityScreen}
        options={{ tabBarIcon: tabIcon('lock-closed-outline', 'lock-closed') }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { role, authChallenge } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!role && authChallenge?.kind === 'setup' ? (
        <Stack.Screen name="MfaSetup" component={MfaSetupScreen} />
      ) : !role && authChallenge?.kind === 'verify' ? (
        <Stack.Screen name="MfaVerify" component={MfaVerifyScreen} />
      ) : !role ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : role === 'gestor' ? (
        <Stack.Group>
          <Stack.Screen name="GestorTabs" component={GestorTabs} />
          <Stack.Screen name="SupplierPassport" component={SupplierPassportScreen} />
          <Stack.Screen name="VerifyResult" component={VerifyResultScreen} />
        </Stack.Group>
      ) : role === 'analista' ? (
        <Stack.Group>
          <Stack.Screen name="AnalistaTabs" component={AnalistaTabs} />
          <Stack.Screen name="ReviewDocument" component={ReviewDocumentScreen} />
          <Stack.Screen name="SupplierPassport" component={SupplierPassportScreen} />
          <Stack.Screen name="VerifyResult" component={VerifyResultScreen} />
        </Stack.Group>
      ) : role === 'verificador' ? (
        <Stack.Group>
          <Stack.Screen name="VerificadorTabs" component={VerificadorTabs} />
          <Stack.Screen name="VerifyResult" component={VerifyResultScreen} />
        </Stack.Group>
      ) : role === 'administrador' ? (
        <Stack.Group>
          <Stack.Screen name="AdministradorTabs" component={AdministradorTabs} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="FornecedorTabs" component={FornecedorTabs} />
          <Stack.Screen name="AddDocument" component={AddDocumentScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
