import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import MyContractABI from "./Contract.json";

const App = () => {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [products, setProducts] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [quantity, setQuantity] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderIndex, setOrderIndex] = useState("");
  const [productName, setProductName] = useState("");

  const contractAddress = "0xb38Db219748d7356Ac3484C209a0B7809F2F296c";

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await _provider.getSigner();
        const _contract = new ethers.Contract(
          contractAddress,
          MyContractABI.abi,
          signer
        );

        setProvider(_provider);
        setContract(_contract);
        const adminAddress = await _contract.getAdmin();
        setAdmin(adminAddress);
      } else {
        alert("Metamask Yüklü Değil!");
      }
    };
    init();
  }, []);


  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const validatedAddress = ethers.getAddress(accounts[0]);
        setAccount(validatedAddress);
      } catch (error) {
        console.error("Geçersiz ethereum adresi:", error);
        alert("Adres geçersiz.");
      }
    }
  };

  const fetchProducts = async () => {
    if (contract) {
      let productsList = [];
      for (let i = 1; i <= 10; i++) {
        try {
          const name = await contract.getProductName(i);
          const price = await contract.getProductToPrice(i, name);
          const quantity = await contract.getProductToQuantity(i, name);
          console.log(`Ürün ${i} - Adı: ${name}, Fiyatı: ${price.toString()}, Miktarı: ${quantity.toString()}`);
          productsList.push({
            index: i,
            name,
            price,
            quantity: parseInt(quantity.toString(), 10),
          });
        } catch (error) {
          console.log(`${i} bulunamadı`);
        }
      }
      setProducts(productsList);
    }
  };

  const createProduct = async (name, quantity, price) => {
    try {
      const tx = await contract.createProduct(name, quantity, price);
      await tx.wait();
      alert("Ürün başarıyla eklendi");
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Ürün eklerken hata meydana geldi");
    }
  };

  const buyProduct = async (productIndex, productName, quantity) => {
    try {
      let price = await contract.getProductToPrice(productIndex, productName);
      price = parseFloat(price);
      const totalCost = price * quantity / (10 ** 18);
      const tx = await contract.buyProducts(productIndex, productName, quantity, {
        value: ethers.parseUnits(totalCost.toString(), 'ether'),
      });
      await tx.wait();
      const orderIndex = await contract.getOrderIndex();
      alert(`${quantity} adet ${productName} satın alındı! Satış numaranız: ${orderIndex}`);
      fetchProducts();
    } catch (error) {
      console.error("Ürün satın alınırken hata meydana geldi:", error);
      alert("Ürün satın alınırken hata meydana geldi", error);
    }
  };


  const deleteProduct = async (productIndex) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        const tx = await contract.deleteProduct(productIndex);
        await tx.wait();
        alert("Ürün başarıyla silindi!");
        fetchProducts();
      } catch (error) {
        console.error(error);
        alert("Ürün silinirken hata meydana geldi");
      }
    }
  };

  const updateProduct = async (productIndex, name, quantity, price) => {
    try {
      const tx = await contract.updateProduct(productIndex, name, quantity, price);
      await tx.wait();
      alert("Ürün başarıyla güncellendi!");
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Ürün güncellenirken hata meydana geldi");
    }
  };

  const fulfillDelivery = async () => {
    if (contract && orderIndex && productName) {
      try {
        const tx = await contract.fulfillDelivery(orderIndex, productName);
        await tx.wait();
        alert(`Sipariş ${orderIndex} numarası için teslim edildi`);
      } catch (error) {
        console.error(error);
        alert("Hata");
      }
    } else {
      alert("Sipariş numaranızı ve ürün adını giriniz.");
    }
  };

  const deleteFulfilledDelivery = async () => {
    if (contract && orderIndex && productName) {
      try {
        const tx = await contract.deleteFulfilledDelivery(orderIndex, productName);
        await tx.wait();
        alert(`Teslim edilen ürün ${orderIndex} numarası için silindi.`);
      } catch (error) {
        console.error(error);
        alert("Teslim edilmiş ürün silinemedi.");
      }
    } else {
      alert("Sipariş numaranızı ve ürün adını giriniz.");
    }
  };

  const handleQuantityChange = (index, value) => {
    setQuantity((prevQuantity) => ({
      ...prevQuantity,
      [index]: value,
    }));
  };

  const handleUpdateFormSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const quantity = e.target.quantity.value;
    const price = ethers.parseEther(e.target.price.value);
    updateProduct(selectedProduct.index, name, quantity, price);
  };

  return (
    <div className="Uygulama">
      <h1>Hesap</h1>
      {account ? (
        <p>Bağlantı Hesabı: {account}</p>
      ) : (
        <button onClick={connectWallet}>Cüzdan Bağla</button>
      )}

      <h2>Ürünler</h2>
      <button onClick={fetchProducts}>Ürünleri Göster</button>
      <ul>
        {products.map((product) => (
          <li key={product.index}>
            {product.name} - Miktar Başına {ethers.formatEther(product.price)} Ether -
            Mevcut Miktar: {product.quantity} -
            Alınıcak Miktar: {quantity[product.index] || 1}
            <input
              type="number"
              value={quantity[product.index] || 1}
              min="1"
              max={product.quantity}
              onChange={(e) => handleQuantityChange(product.index, e.target.value)}
              style={{ marginLeft: "10px" }}
            />
            <button
              onClick={() => buyProduct(product.index, product.name, quantity[product.index] || 1)}
              style={{ marginLeft: "10px" }}
            >
              Satın Al
            </button>

            {account === admin && (
              <>
                <button
                  onClick={() => setSelectedProduct(product)}
                  style={{ marginLeft: "10px", color: "blue" }}
                >
                  Güncelle
                </button>
                <button
                  onClick={() => deleteProduct(product.index)}
                  style={{ marginLeft: "10px", color: "red" }}
                >
                  Sil
                </button>
              </>
            )}
          </li>
        ))}

      </ul>

      {selectedProduct && (
        <div>
          <h2>Ürün Güncelle</h2>
          <form onSubmit={handleUpdateFormSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Yeni Ürün Adı"
              defaultValue={selectedProduct.name}
              required
            />
            <input
              type="number"
              name="quantity"
              placeholder="Yeni Miktar"
              defaultValue={selectedProduct.quantity}
              required
            />
            <input
              type="text"
              name="price"
              placeholder="Yeni ETH Fiyat"
              defaultValue={ethers.formatEther(selectedProduct.price)}
              required
            />
            <button type="submit">Güncelle</button>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
            >
              İptal
            </button>
          </form>
        </div>
      )}

      {account === admin && (
        <>
          <h2>Ürün Ekle</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = e.target.name.value;
              const quantity = e.target.quantity.value;
              const price = ethers.parseEther(e.target.price.value);
              createProduct(name, quantity, price);
            }}
          >
            <input type="text" name="name" placeholder="Adı" required />
            <input type="number" name="quantity" placeholder="Miktar" required />
            <input type="text" name="price" placeholder="ETH Fiyat" required />
            <button type="submit">Ekle</button>
          </form>
        </>
      )}

      {account === admin && (
        <>
          <h2>Fulfill Delivery</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fulfillDelivery();
            }}
          >
            <input
              type="number"
              placeholder="Sipariş Numarası"
              value={orderIndex}
              onChange={(e) => setOrderIndex(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Ürün Adı"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <button type="Tamamla">Siparişi Tamamla</button>
          </form>

          <h2>Tamamlanmış Siparişi Sil</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              deleteFulfilledDelivery();
            }}
          >
            <input
              type="number"
              placeholder="Sipariş Numarası"
              value={orderIndex}
              onChange={(e) => setOrderIndex(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Ürün Adı"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <button type="submit">Tamamlanmış Siparişi Sil</button>
          </form>
        </>
      )}
    </div>

  );
};

export default App;
