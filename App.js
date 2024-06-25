import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Centrifuge } from 'centrifuge';

// Constants for WebSocket URL and token
const base_url = 'wss://api.testnet.rabbitx.io/ws';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwIiwiZXhwIjo1MjYyNjUyMDEwfQ.x_245iYDEvTTbraw1gt4jmFRFfgMJb-GJ-hsU9HuDik';

// Maximum number of initial results to display
const maxResults = 10;

const Orderbook = () => {
  const [bids, setBids] = useState({});
  const [asks, setAsks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMoreBids, setShowMoreBids] = useState(false);
  const [showMoreAsks, setShowMoreAsks] = useState(false);

  const centrifugeRef = useRef(null);

  useEffect(() => {
    // Initialize Centrifuge instance
    const centrifuge = new Centrifuge(base_url, {
      token: token,
    });

    // Create a new subscription for the orderbook
    const sub = centrifuge.newSubscription("orderbook:BTC-USD");

    // Event handler when subscription is successful
    sub.on('subscribed', (ctx) => {
      const data = ctx.data;
      updateOrderbook(data); // Update the orderbook with received data
      setLoading(false); // Set loading state to false when data is loaded
    });

    // Event handler for Centrifuge errors
    centrifuge.on('error', (err) => {
      console.error('Centrifuge error:', err);
      handleError(); // Handle error and attempt reconnection
    });

    // Connect to Centrifuge server and subscribe to the channel
    centrifuge.connect();
    sub.subscribe();

    // Store the Centrifuge instance in ref for cleanup
    centrifugeRef.current = centrifuge;

    // Cleanup function to disconnect from Centrifuge on component unmount
    return () => {
      centrifuge.disconnect();
    };
  }, []);

  // Function to handle Centrifuge connection errors
  const handleError = () => {
    setError('Connection error. Please check your network.');
    setTimeout(() => {
      if (centrifugeRef.current) {
        centrifugeRef.current.connect();
        centrifugeRef.current.subscribe();
      }
    }, 3000); // Retry connection after 3 seconds
  };

  // Function to update bids and asks in the orderbook
  const updateOrderbook = (data) => {
    const newBids = data.bids.reduce((acc, bid) => {
      acc[bid[0]] = { price: bid[0], quantity: bid[1] };
      return acc;
    }, {});

    const newAsks = data.asks.reduce((acc, ask) => {
      acc[ask[0]] = { price: ask[0], quantity: ask[1] };
      return acc;
    }, {});

    setBids((prevBids) => ({ ...prevBids, ...newBids }));
    setAsks((prevAsks) => ({ ...prevAsks, ...newAsks }));
  };

  // Function to display an alert if there is an error
  const showAlert = () => {
    if (error) {
      Alert.alert(
        'Error',
        error,
        [{ text: 'OK', onPress: () => setError(null) }],
        { cancelable: false }
      );
    }
  };

  // Effect to show alert when error state changes
  useEffect(() => {
    showAlert();
  }, [error]);

  // Toggle function to show more or less bids
  const toggleShowMoreBids = () => {
    setShowMoreBids((prev) => !prev);
  };

  // Toggle function to show more or less asks
  const toggleShowMoreAsks = () => {
    setShowMoreAsks((prev) => !prev);
  };

  // Render component
  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      {loading ? (
        // Show loading indicator when data is loading
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading...</Text>
        </View>
      ) : (
        // Show orderbook when data is loaded
        <View style={styles.maincontainer}>
          {/* Display bids */}
          <OrderList title="Bids" orders={bids} showMore={showMoreBids} toggleShowMore={toggleShowMoreBids} />
          {/* Display asks */}
          <OrderList title="Asks" orders={asks} showMore={showMoreAsks} toggleShowMore={toggleShowMoreAsks} />
        </View>
      )}
    </ScrollView>
  );
};

// Component to display order list
const OrderList = ({ title, orders, showMore, toggleShowMore }) => (
  <View style={styles.section}>
    <Text style={styles.header}>{title}</Text>
    <View style={styles.orderList}>
      {/* Header row */}
      <View style={styles.orderItem}>
        <Text style={[styles.price, styles.bold, styles.bold, { fontSize: 16 }]}>Price (USD)</Text>
        <Text style={[styles.price, styles.bold, { fontSize: 16 }]}>Quantity (BTC)</Text>
      </View>
      {/* List of orders */}
      {Object.values(orders).slice(0, showMore ? Object.keys(orders).length : maxResults).map((order, index) => (
        <View key={index} style={styles.orderItem}>
          <Text style={[styles.price, title === 'Bids' ? styles.textGreen : styles.textRed]}>
            {order.price ? Number(order.price).toLocaleString() : 'N/A'}
          </Text>
          <Text style={styles.quantity}>{order.quantity}</Text>
        </View>
      ))}
      {/* Toggle button to show more or less orders */}
      {Object.keys(orders).length > maxResults && (
        <TouchableOpacity onPress={toggleShowMore}>
          <Text style={styles.toggleText}>{showMore ? 'Show Less > ' : 'Show More > '}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Styles for components
const styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
  scrollViewContainer: {
    flexGrow: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maincontainer: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  section: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'left',
    color: 'white',
  },
  orderList: {
    marginTop: 5,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  price: {
    fontWeight: 'bold',
  },
  quantity: {
    marginLeft: 10,
    color:'white'
  },
  textGreen: {
    color: '#27ae60',
  },
  textRed: {
    color: '#c0392b',
  },
  toggleText: {
    color: 'grey',
    textAlign: 'right',
    marginTop: 5,
    textDecorationLine: 'underline',
  },
});

export default Orderbook;
