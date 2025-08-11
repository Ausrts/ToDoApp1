// 替换 edit.jsx 的完整内容
import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Text,
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../services/todoService';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function EditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { todo: todoString } = useLocalSearchParams();
  
  const todo = todoString ? JSON.parse(todoString) : { id: null, title: '' };
  const [title, setTitle] = useState(todo.title || '');
  const [dueDate, setDueDate] = useState(todo.dueDate ? new Date(todo.dueDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // 请求通知权限
  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status === 'granted');
    };
    requestPermission();
  }, []);

  // 调度通知（新增）
  const scheduleNotification = async (todoTitle, date) => {
    if (!notificationPermission) {
      console.log('No notification permission');
      return;
    }

    try {
      // 取消之前的通知
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const now = new Date();
      
      // 5分钟前提醒
      const fiveMinBefore = new Date(date);
      fiveMinBefore.setMinutes(fiveMinBefore.getMinutes() - 5);
      
      if (fiveMinBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ To-Do Reminder',
            body: `"${todoTitle}" is due in 5 minutes`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: fiveMinBefore,
        });
        console.log('5分钟提醒已设置');
      }
      
      // 到期提醒
      if (date > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 To-Do Due',
            body: `"${todoTitle}" is now due`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: date,
        });
        console.log('到期提醒已设置');
      }
    } catch (error) {
      console.error('通知调度失败:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter the to-do content');
      return;
    }

    try {
      const updatedTodo = { 
        ...todo, 
        title: title.trim(),
        dueDate: dueDate.toISOString()
      };
      
      await updateTodo(updatedTodo);
      
      // 刷新待办列表
      await queryClient.invalidateQueries(['todos']);
      
      // 调度新的通知
      await scheduleNotification(title.trim(), dueDate);
      
      Alert.alert(
        '✅ Updated Successfully',
        `"${title}" has been updated and new reminders have been set`,
        [{ text: 'OK' }]
      );
      
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Save failed, please try again');
      console.error('Save error:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert(
          'Date Notice',
          `The selected date ${selectedDate.toLocaleDateString()} is in the past. Are you sure you want to modify it?`,
          [
            { text: 'Confirm', onPress: () => setDueDate(selectedDate) },
            { text: 'Reselect', onPress: () => setShowDatePicker(true) }
          ]
        );
      } else {
        setDueDate(selectedDate);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  const showDatePickerDialog = () => setShowDatePicker(true);
  const showTimePickerDialog = () => setShowTimePicker(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit To-Do</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter to-do title"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <View style={styles.dateContainer}>
        <Button
          title="Select Due Date"
          onPress={showDatePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          Selected: {dueDate.toLocaleDateString()}
        </Text>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      <View style={styles.dateContainer}>
        <Button
          title="Set Reminder Time"
          onPress={showTimePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          Reminder Time: {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {showTimePicker && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={() => router.back()}
          color="#017BFF"
        />
        <Button
          title="Save"
          onPress={handleSave}
          color="#017BFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 24,
  },
});