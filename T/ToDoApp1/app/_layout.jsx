import { Stack } from 'expo-router';
import ReactQueryProvider from './context/ReactQueryProvider';

export default function RootLayout() {
  return (
    <ReactQueryProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: '待办事项' }} />
        <Stack.Screen name="add" options={{ title: '添加待办事项' }} />
        <Stack.Screen name="edit" options={{ title: '编辑待办事项' }} />
      </Stack>
    </ReactQueryProvider>
  );
}
