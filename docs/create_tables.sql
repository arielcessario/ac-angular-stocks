
# STOCK
CREATE TABLE stock (
  stock_id int(11) NOT NULL AUTO_INCREMENT,
  producto_id int(11) DEFAULT NULL,
  proveedor_id int(11) DEFAULT NULL,
  sucursal_id int(11) DEFAULT NULL,
  fecha_compra timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  cant_actual int(11) DEFAULT NULL,
  cant_inicial int(11) DEFAULT NULL,
  costo_uni decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (stock_id),
  KEY STOCK_PRODUCTO_KEY (producto_id),
  KEY STOCK_SUCURSAL_KEY (sucursal_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

# PEDIDOS
CREATE TABLE pedidos (
  pedido_id int(11) NOT NULL AUTO_INCREMENT,
  proveedor_id int(11) DEFAULT NULL,
  usuario_id int(11) DEFAULT NULL,
  fecha_pedido timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_entrega timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  total decimal(8,2) DEFAULT NULL,
  iva decimal(8,2) DEFAULT NULL,
  sucursal_id int(11) DEFAULT NULL,
  PRIMARY KEY (pedido_id),
  KEY PEDIDO_SUCURSAL_KEY (sucursal_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


# DETALLE PEDIDOS -> Detalle del pedido
CREATE TABLE pedidos_detalles (
  pedido_detalle_id int(11) NOT NULL AUTO_INCREMENT,
  pedido_id int(11) DEFAULT NULL,
  producto_id int(11) DEFAULT NULL,
  cantidad int(11) DEFAULT NULL,
  precio_unidad decimal(8,2) DEFAULT NULL,
  precio_total decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (pedido_detalle_id),
  KEY DETALLE_PRODUCTO_KEY (producto_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
