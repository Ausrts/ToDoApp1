import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, StyleSheet, View, Text, TextInput, Button, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function AddTodoScreen() {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Notification Permission',
        'Notification permission is required to remind you of tasks at the specified time. Please enable notification permission in settings.'
      );
    } else if (Platform.OS === 'android') {
      // Restore Android high-priority channel
      await Notifications.setNotificationChannelAsync('high-priority', {
        name: 'ToDo Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  // Schedule actual phone notifications
  const scheduleNotification = async (todoTitle, dueDate) => {
    if (!notificationPermission) {
      Alert.alert('Reminder', 'Please enable notification permission in settings to receive reminders');
      return;
    }
  
    try {
      const now = new Date();
      const preciseDueDate = new Date(dueDate);
      preciseDueDate.setSeconds(0);
      preciseDueDate.setMilliseconds(0);
  
      // Reminder 5 minutes before
      const fiveMinBefore = new Date(preciseDueDate);
      fiveMinBefore.setMinutes(fiveMinBefore.getMinutes() - 5);
      fiveMinBefore.setSeconds(0);
      fiveMinBefore.setMilliseconds(0);
  
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
      }
      
      // Due date reminder
      if (preciseDueDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 To-Do Due',
            body: `${todoTitle} is now due`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: preciseDueDate,
        });
      }
      
      console.log('Notification scheduled successfully');
    } catch (error) {
      console.error('Failed to set notification:', error);
    }
  };

  const addMutation = useMutation({
    mutationFn: addTodo,
    onSuccess: async (newTodo) => {
      try {
        const existingTodos = JSON.parse(await AsyncStorage.getItem('@todos')) || [];

        const existingIds = existingTodos.map(todo => todo.id);
        let newId = Date.now() + Math.floor(Math.random() * 1000);
        while (existingIds.includes(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000);
        }

        const todoToAdd = {
          id: newId,
          title: newTodo.title || title.trim(),
          completed: newTodo.completed || false,
          userId: newTodo.userId || 1,
          dueDate: newTodo.dueDate || dueDate.toISOString()
        };
        
        const updatedTodos = [...existingTodos, todoToAdd];
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        
        // Use the actual notification system
        await scheduleNotification(todoToAdd.title, new Date(todoToAdd.dueDate));
        
        Alert.alert(
          '✅ Added Successfully',
          `"${todoToAdd.title}" has been added and will remind you at the specified time via notification`,
          [{ text: 'OK' }]
        );
        
        navigation.goBack();
      } catch (error) {
        console.error('Save failed:', error);
        Alert.alert('Error', 'Save failed, please try again');
      }
    },
    onError: (error) => {
      Alert.alert('Error', `Add failed: ${error.message}`);
    },
  });

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert(
          'Date Notice',
          `The selected date ${selectedDate.toLocaleDateString()} is in the past. Are you sure you want to add it?`,
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

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Input Error', 'Please enter the to-do title');
      return;
    }

    addMutation.mutate({
      title: title.trim(),
      completed: false,
      userId: 1,
      dueDate: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), dueDate.getHours(), dueDate.getMinutes(), 0, 0).toISOString()
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New To-Do</Text>

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
          onPress={() => setShowDatePicker(true)}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          Selected Date: {dueDate.toLocaleDateString()}
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
          onPress={() => setShowTimePicker(true)}
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
          onPress={() => navigation.goBack()}
          color="#017BFF"
        />
        <Button
          title="Add"
          onPress={handleSubmit}
          color="#017BFF"
          disabled={addMutation.isPending}
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