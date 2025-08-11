import { Stack } from 'expo-router';
import ReactQueryProvider from './context/ReactQueryProvider';


export default function RootLayout() {
  return (
    <ReactQueryProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'To-Do List' }} />
        <Stack.Screen name="add" options={{ title: 'Add To-Do Item' }} />
        <Stack.Screen name="edit" options={{ title: 'Edit To-Do Item' }} />
      </Stack>
    </ReactQueryProvider>
  );
}