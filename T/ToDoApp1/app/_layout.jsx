import { Stack } from 'expo-router';
import { View, StyleSheet, LogBox } from 'react-native';
import ReactQueryProvider from './context/ReactQueryProvider';

// 启用调试日志
LogBox.ignoreLogs(['Warning: ...']); // 忽略特定警告
console.log('RootLayout loaded');

export default function RootLayout() {
  return (
    <ReactQueryProvider>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#f5f5f5' },
            headerTintColor: '#333',
          }}
        >
          <Stack.Screen name="index" options={{ title: '待办事项' }} />
          <Stack.Screen name="add" options={{ title: '添加待办事项' }} />
        </Stack>
      </View>
    </ReactQueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // 确保容器占满整个屏幕
  },
});