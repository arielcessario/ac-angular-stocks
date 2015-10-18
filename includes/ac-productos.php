<?php
/* TODO:
 * */


session_start();


// Token
$decoded_token = null;

if (file_exists('../../../includes/MyDBi.php')) {
    require_once '../../../includes/MyDBi.php';
    require_once '../../../includes/config.php';
} else {
    require_once 'MyDBi.php';
}

$data = file_get_contents("php://input");

// Decode data from js
$decoded = json_decode($data);


// Si la seguridad está activa
if ($jwt_enabled) {

    // Las funciones en el if no necesitan usuario logged
    if (($decoded == null) && (($_GET["function"] != null) &&
            ($_GET["function"] == 'getPedidos' ||
                $_GET["function"] == 'getPedidodetalles' ||
                $_GET["function"] == 'getStocks'))
    ) {
        $token = '';
    } else {
        checkSecurity();
    }

}


if ($decoded != null) {
    if ($decoded->function == 'createPedido') {
        createPedido($decoded->pedido);
    } else if ($decoded->function == 'createPedidoDetalle') {
        createPedidoDetalle($decoded->pedidodetalle);
    } else if ($decoded->function == 'createStock') {
        createStock($decoded->stock);
    } else if ($decoded->function == 'updatePedido') {
        updatePedido($decoded->Pedido);
    } else if ($decoded->function == 'updatePedidoDetalle') {
        updatePedidoDetalle($decoded->PedidoDetalle);
    } else if ($decoded->function == 'updateStockDetalle') {
        updateStockDetalle($decoded->Stock_detalle);
    } else if ($decoded->function == 'updateStock') {
        updateStock($decoded->Stock);
    } else if ($decoded->function == 'removePedido') {
        removePedido($decoded->Pedido_id);
    } else if ($decoded->function == 'removePedidoDetalle') {
        removePedidoDetalle($decoded->PedidoDetalle_id);
    } else if ($decoded->function == 'removeStock') {
        removeStock($decoded->Stock_id);
    }
} else {
    $function = $_GET["function"];
    if ($function == 'getPedidos') {
        getPedidos();
    } elseif ($function == 'getPedidoDetalles') {
        getPedidoDetalles();
    } elseif ($function == 'getStocks') {
        getStocks($_GET["usuario_id"]);
    }
}


/////// INSERT ////////
/**Crea un pedido con fecha de entrega "vacia" = 0000-00-00 00:00:00
 * @param $pedido
 */
function createPedido($pedido)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkPedido(json_decode($pedido));

    $data = array(
        'proveedor_id' => $item_decoded->proveedor_id,
        'usuario_id' => $item_decoded->usuario_id,
        'total' => $item_decoded->total,
        'iva' => $item_decoded->iva,
        'sucursal_id' => $item_decoded->sucursal_id
    );

    $result = $db->insert('pedidos', $data);
    if ($result > -1) {
        foreach ($item_decoded->depidos_detalles as $pedido_detalle) {
            $subitem_decoded = checkPedidodetalle(json_decode($pedido_detalle));

            $data = array(
                'pedido_id' => $item_decoded->pedido_id,
                'producto_id' => $subitem_decoded->producto_id,
                'cantidad' => $subitem_decoded->cantidad,
                'precio_unidad' => $subitem_decoded->precio_unidad,
                'precio_total' => $subitem_decoded->precio_total
            );

            $result = $db->insert('pedidos_detalles', $data);
            if ($result > -1) {
                $db->commit();
            } else {
                $db->rollback();
            }
        }

        $db->commit();
        echo json_encode($result);
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}


/**Crea una entrada de stock por producto.
 * @param $stock
 */
function createStock($stock)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkPedidodetalle(json_decode($stock));

    $data = array(
        'producto_id' => $item_decoded->producto_id,
        'proveedor_id' => $item_decoded->proveedor_id,
        'sucursal_id' => $item_decoded->sucursal_id,
        'cant_actual' => $item_decoded->cant_actual,
        'cant_total' => $item_decoded->cant_total,
        'costo_uni' => $item_decoded->precio_unidad
    );

    $result = $db->insert('pedidodetalles', $data);
    if ($result > -1) {
        $db->commit();
        echo json_encode($result);
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}


/**
 * @description Crea un detalle de pedido
 * @param $pedido_detalle
 */
function createPedidoDetalle($pedido_detalle)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkPedidodetalle(json_decode($pedido_detalle));

    $data = array(
        'pedido_id' => $item_decoded->pedido_id,
        'producto_id' => $item_decoded->producto_id,
        'cantidad' => $item_decoded->cantidad,
        'precio_unidad' => $item_decoded->precio_unidad,
        'precio_total' => $item_decoded->precio_total
    );

    $result = $db->insert('pedidos_detalles', $data);
    if ($result > -1) {
        $db->commit();
        echo json_encode($result);
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}

/////// UPDATE ////////

/**
 * @description Modifica un pedido
 * @param $product
 */
function updatePedido($pedido)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkPedido(json_decode($pedido));

    $db->where('pedido_id', $item_decoded->pedido_id);
    $data = array(
        'proveedor_id' => $item_decoded->proveedor_id,
        'usuario_id' => $item_decoded->usuario_id,
        'total' => $item_decoded->total,
        'iva' => $item_decoded->iva,
        'sucursal_id' => $item_decoded->sucursal_id
    );

    $result = $db->update('pedidos', $data);


    if ($result) {
        $db->delete('pedidos_detalles');
        foreach ($item_decoded->depidos_detalles as $pedido_detalle) {
            $subitem_decoded = checkPedidodetalle(json_decode($pedido_detalle));

            $data = array(
                'pedido_id' => $item_decoded->pedido_id,
                'producto_id' => $subitem_decoded->producto_id,
                'cantidad' => $subitem_decoded->cantidad,
                'precio_unidad' => $subitem_decoded->precio_unidad,
                'precio_total' => $subitem_decoded->precio_total
            );

            $result = $db->insert('pedidos_detalles', $data);
            if ($result > -1) {
                $db->commit();
            } else {
                $db->rollback();
            }
            $db->commit();
            echo json_encode($result);
        }
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}

/**
 * @description Modifica un detalle de pedido
 * @param $pedido_detalle
 */
function updatePedidoDetalle($pedido_detalle)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkPedidoDetalle(json_decode($pedido_detalle));
    $db->where('pedido_detalle_id', $item_decoded->pedido_detalle_id);
    $data = array(
        'pedido_id' => $item_decoded->pedido_id,
        'producto_id' => $item_decoded->producto_id,
        'cantidad' => $item_decoded->cantidad,
        'precio_unidad' => $item_decoded->precio_unidad,
        'precio_total' => $item_decoded->precio_total
    );

    $result = $db->update('pedido_detalles', $data);
    if ($result) {
        $db->commit();
        echo json_encode($result);
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}


/**
 * @description Modifica un stock
 * @param $stock
 */
function updateStock($stock)
{
    $db = new MysqliDb();
    $db->startTransaction();
    $item_decoded = checkStock(json_decode($stock));
    $db->where('stock_id', $item_decoded->stock_id);
    $data = array(
        'status' => $item_decoded->status,
        'total' => $item_decoded->total,
        'fecha' => $item_decoded->fecha,
        'usuario_id' => $item_decoded->usuario_id
    );

    $result = $db->update('stock', $data);
    if ($result) {

        $db->commit();
        echo json_encode($result);
    } else {
        $db->rollback();
        echo json_encode(-1);
    }
}

/////// REMOVE ////////

/**
 * @description Elimina un pedido
 * @param $pedido_id
 */
function removePedido($pedido_id)
{
    $db = new MysqliDb();

    $db->where("pedido_id", $pedido_id);
    $results = $db->delete('pedidos');

    $db->where("pedido_id", $pedido_id);
    $db->delete('pedidos_detalles');

    if ($results) {

        echo json_encode(1);
    } else {
        echo json_encode(-1);

    }
}


/**
 * @description Elimina una detalle de pedido
 * @param $pedidodetalle_id
 */
function removePedidoDetalle($pedido_detalle_id)
{
    $db = new MysqliDb();

    $db->where("pedido_detalle_id", $pedido_detalle_id);
    $results = $db->delete('pedidos_detalles');

    if ($results) {

        echo json_encode(1);
    } else {
        echo json_encode(-1);

    }
}

/**
 * @description Elimina un stock
 * @param $stock_id
 */
function removeStock($stock_id)
{
    $db = new MysqliDb();

    $db->where("stock_id", $stock_id);
    $results = $db->delete('stock');

    if ($results) {

        echo json_encode(1);
    } else {
        echo json_encode(-1);

    }
}


/////// GET ////////
/**
 * @descr Obtiene los pedidos
 */
function getPedidos()
{
    $db = new MysqliDb();

//    $results = $db->get('pedidos');
    $results = $db->rawQuery('SELECT
    p.pedido_id,
    p.proveedor_id,
    p.usuario_id,
    p.fecha_pedido,
    p.fecha_entrega,
    p.total,
    p.iva,
    p.sucursal_id,
    pr.nombre nombreProveedor,
    pr.apellido apellidoProveedor,
    u.nombre nombreUsuario,
    u.apellido apellidoUsuario,
    pd.pedido_detalle_id,
    pd.producto_id,
    pd.cantidad,
    pd.precio_unidad,
    pd.precio_total,
    o.nombre nombrProducto
FROM
    pedidos p
        INNER JOIN
    usuarios u ON p.usuario_id = u.usuario_id
        INNER JOIN
    usuarios pr ON p.proveedor_id = pr.usuario_id
        LEFT JOIN
    pedidos_detalles pd ON p.pedido_id = pr.pedido_id
        INNER JOIN
    productos o ON o.producto_id = pd.producto_id
GROUP BY p.pedido_id,
    p.proveedor_id,
    p.usuario_id,
    p.fecha_pedido,
    p.fecha_entrega,
    p.total,
    p.iva,
    p.sucursal_id,
    pr.nombre,
    pr.apellido,
    u.nombre,
    u.apellido,
    pd.pedido_detalle_id,
    pd.producto_id,
    pd.cantidad,
    pd.precio_unidad,
    pd.precio_total,
    o.nombre
;');


    $final = array();
    foreach ($results as $row) {

        if (!isset($final[$row["pedido_id"]])) {
            $final[$row["pedido_id"]] = array(
                'pedido_id' => $row["pedido_id"],
                'nombre' => $row["nombrePedido"],
                'descripcion' => $row["descripcion"],
                'pto_repo' => $row["pto_repo"],
                'sku' => $row["sku"],
                'status' => $row["status"],
                'vendidos' => $row["vendidos"],
                'destacado' => $row["destacado"],
                'pedido_tipo' => $row["pedido_tipo"],
                'en_slider' => $row["en_slider"],
                'en_oferta' => $row["en_oferta"],
                'pedidodetalles' => array(),
                'precios' => array(),
                'fotos' => array(),
                'kits' => array(),
                'proveedores' => array()
            );
        }
        $have_cat = false;
        if ($row["pedidodetalle_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['pedidodetalles']) > 0) {
                foreach ($final[$row['pedido_id']]['pedidodetalles'] as $cat) {
                    if ($cat['pedidodetalle_id'] == $row["pedidodetalle_id"]) {
                        $have_cat = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['pedidodetalles'][] = array(
                    'pedidodetalle_id' => $row['pedidodetalle_id'],
                    'nombre' => $row['nombrePedidodetalle'],
                    'parent_id' => $row['parent_id']
                );

                $have_cat = true;
            }

            if (!$have_cat) {
                array_push($final[$row['pedido_id']]['pedidodetalles'], array(
                    'pedidodetalle_id' => $row['pedidodetalle_id'],
                    'nombre' => $row['nombrePedidodetalle'],
                    'parent_id' => $row['parent_id']
                ));
            }
        }


        $have_pre = false;
        if ($row["precio_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['precios']) > 0) {
                foreach ($final[$row['pedido_id']]['precios'] as $cat) {
                    if ($cat['precio_id'] == $row["precio_id"]) {
                        $have_pre = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['precios'][] = array(
                    'precio_id' => $row['precio_id'],
                    'precio_tipo_id' => $row['precio_tipo_id'],
                    'precio' => $row['precio']
                );

                $have_pre = true;
            }

            if (!$have_pre) {
                array_push($final[$row['pedido_id']]['precios'], array(
                    'precio_id' => $row['precio_id'],
                    'precio_tipo_id' => $row['precio_tipo_id'],
                    'precio' => $row['precio']
                ));
            }
        }


        $have_fot = false;
        if ($row["pedido_foto_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['fotos']) > 0) {
                foreach ($final[$row['pedido_id']]['fotos'] as $cat) {
                    if ($cat['pedido_foto_id'] == $row["pedido_foto_id"]) {
                        $have_fot = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['fotos'][] = array(
                    'pedido_foto_id' => $row['pedido_foto_id'],
                    'nombre' => $row['nombreFoto'],
                    'main' => $row['main']
                );

                $have_fot = true;
            }

            if (!$have_fot) {
                array_push($final[$row['pedido_id']]['fotos'], array(
                    'pedido_foto_id' => $row['pedido_foto_id'],
                    'nombre' => $row['nombreFoto'],
                    'main' => $row['main']
                ));
            }
        }

        $have_kit = false;
        if ($row["pedido_kit_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['kits']) > 0) {
                foreach ($final[$row['pedido_id']]['kits'] as $cat) {
                    if ($cat['pedido_kit_id'] == $row["pedido_kit_id"]) {
                        $have_kit = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['kits'][] = array(
                    'pedido_kit_id' => $row['pedido_kit_id'],
                    'pedido_id' => $row['pedidoKit'],
                    'cantidad' => $row['cantidad']
                );

                $have_kit = true;
            }

            if (!$have_kit) {
                array_push($final[$row['pedido_id']]['kits'], array(
                    'pedido_kito_id' => $row['pedido_kito_id'],
                    'pedido_id' => $row['pedidoKit'],
                    'cantidad' => $row['cantidad']
                ));
            }
        }


        $have_pro = false;
        if ($row["usuario_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['proveedores']) > 0) {
                foreach ($final[$row['pedido_id']]['proveedores'] as $cat) {
                    if ($cat['usuario_id'] == $row["usuario_id"]) {
                        $have_pro = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['proveedores'][] = array(
                    'usuario_id' => $row['usuario_id'],
                    'nombre' => $row['nombreUsuario'],
                    'apellido' => $row['apellido']
                );

                $have_pro = true;
            }

            if (!$have_pro) {
                array_push($final[$row['pedido_id']]['proveedores'], array(
                    'usuario_id' => $row['usuario_id'],
                    'nombre' => $row['nombreUsuario'],
                    'apellido' => $row['apellido']
                ));
            }
        }
    }
    echo json_encode(array_values($final));
}


/**
 * @descr Obtiene las pedidodetalles
 */
function getPedidoDetalles()
{
    $db = new MysqliDb();
    $results = $db->get('pedidodetalles');

    echo json_encode($results);
}


/**
 * @descr Obtiene los pedidos. En caso de enviar un usuario_id != -1, se traerán todos los stocks. Solo usar esta opción cuando se aplica en la parte de administración
 */
function getStocks($usuario_id)
{
    $db = new MysqliDb();
    if ($usuario_id != -1) {
        $db->where('c.usuario_id', $usuario_id);
    }
    $db->join("usuarios u", "u.usuario_id=c.usuario_id", "LEFT");
    $results = $db->get('stocks c', null, 'c.stock_id, c.status, c.total, c.fecha, c.usuario_id, u.nombre, u.apellido');

    foreach ($results as $key => $row) {

        $db = new MysqliDb();
        $db->where('stock_id', $row['stock_id']);
        $db->join("pedidos p", "p.pedido_id=c.pedido_id", "LEFT");
        $pedidodetalles = $db->get('stock_detalles c', null, 'c.stock_detalle_id, c.stock_id, c.pedido_id, p.nombre, c.cantidad, c.en_oferta, c.precio_unitario');
        $results[$key]['pedidodetalles'] = $pedidodetalles;

    }
    echo json_encode($results);
}

/**
 * @description Verifica todos los campos de pedido para que existan
 * @param $pedido
 * @return mixed
 */
function checkPedido($pedido)
{


    $pedido->proveedor_id = (!array_key_exists("proveedor_id", $pedido)) ? -1 : $pedido->proveedor_id;
    $pedido->usuario_id = (!array_key_exists("usuario_id", $pedido)) ? -1 : $pedido->usuario_id;
    $pedido->fecha_pedido = (!array_key_exists("fecha_pedido", $pedido)) ? '' : $pedido->fecha_pedido;
    $pedido->fecha_entrega = (!array_key_exists("fecha_entrega", $pedido)) ? '0000-00-00 00:00:00' : $pedido->fecha_entrega;
    $pedido->total = (!array_key_exists("total", $pedido)) ? 1 : $pedido->total;
    $pedido->iva = (!array_key_exists("iva", $pedido)) ? 0.0 : $pedido->iva;
    $pedido->sucursal_id = (!array_key_exists("sucursal_id", $pedido)) ? -1 : $pedido->sucursal_id;

    return $pedido;
}


/**
 * @description Verifica todos los campos de pedidodetalle para que existan
 * @param $pedido_detalle
 * @return mixed
 */
function checkPedidoDetalle($pedido_detalle)
{
    $pedido_detalle->pedido_id = (!array_key_exists("pedido_id", $pedido_detalle)) ? -1 : $pedido_detalle->pedido_id;
    $pedido_detalle->producto_id = (!array_key_exists("producto_id", $pedido_detalle)) ? -1 : $pedido_detalle->producto_id;
    $pedido_detalle->cantidad = (!array_key_exists("cantidad", $pedido_detalle)) ? 0 : $pedido_detalle->cantidad;
    $pedido_detalle->precio_unidad = (!array_key_exists("precio_unidad", $pedido_detalle)) ? 0.0 : $pedido_detalle->precio_unidad;
    $pedido_detalle->precio_total = (!array_key_exists("precio_total", $pedido_detalle)) ? 0.0 : $pedido_detalle->precio_total;
    return $pedido_detalle;
}

/**
 * @description Verifica todos los campos de stock para que existan
 * @param $stock
 * @return mixed
 */
function checkStock($stock)
{
    $stock->proveedor_id = (!array_key_exists("proveedor_id", $stock)) ? -1 : $stock->proveedor_id;
    $stock->producto_id = (!array_key_exists("producto_id", $stock)) ? -1 : $stock->producto_id;
    $stock->sucursal_id = (!array_key_exists("sucursal_id", $stock)) ? 0 : $stock->sucursal_id;
    $stock->cant_actual = (!array_key_exists("cant_actual", $stock)) ? 0.0 : $stock->cant_actual;
    $stock->cant_total = (!array_key_exists("cant_total", $stock)) ? 0.0 : $stock->cant_total;
    $stock->costo_uni = (!array_key_exists("costo_uni", $stock)) ? 0.0 : $stock->costo_uni;

    return $stock;
}

