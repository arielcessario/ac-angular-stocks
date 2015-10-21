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
//    if (($decoded == null) && (($_GET["function"] != null) &&
//            ($_GET["function"] == 'getPedidos' ||
//                $_GET["function"] == 'getPedidodetalles' ||
//                $_GET["function"] == 'getStocks'))
//    ) {
//        $token = '';
//    } else {
    checkSecurity();
//    }

}


if ($decoded != null) {
    if ($decoded->function == 'createPedido') {
        createPedido($decoded->pedido);
    } else if ($decoded->function == 'createPedidoDetalle') {
        createPedidoDetalle($decoded->pedido´_detalle);
    } else if ($decoded->function == 'createStock') {
        createStock($decoded->stock);
    } else if ($decoded->function == 'updatePedido') {
        updatePedido($decoded->pedido);
    } else if ($decoded->function == 'updatePedidoDetalle') {
        updatePedidoDetalle($decoded->pedido_detalle);
    } else if ($decoded->function == 'updateStock') {
        updateStock($decoded->stock);
    } else if ($decoded->function == 'removePedido') {
        removePedido($decoded->pedido_id);
    } else if ($decoded->function == 'removePedidoDetalle') {
        removePedidoDetalle($decoded->pedido_detalle_id);
    } else if ($decoded->function == 'removeStock') {
        removeStock($decoded->stock_id);
    } else if ($decoded->function == 'trasladar') {
        trasladar($decoded->origen_id, $decoded->destino_id, $decoded->producto_id, $decoded->cantidad);
    }
} else {
    $function = $_GET["function"];
    if ($function == 'getPedidos') {
        getPedidos($_GET["all"]);
    } elseif ($function == 'getPedidoDetalles') {
        getPedidosDetalles($_GET["pedido_id"]);
    } elseif ($function == 'getStocks') {
        getStocks($_GET["reducido"]);
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
        foreach ($item_decoded->pedidos_detalles as $pedido_detalle) {
            $subitem_decoded = checkPedidodetalle($pedido_detalle);

            $data = array(
                'pedido_id' => $result,
                'producto_id' => $subitem_decoded->producto_id,
                'cantidad' => $subitem_decoded->cantidad,
                'precio_unidad' => $subitem_decoded->precio_unidad,
                'precio_total' => $subitem_decoded->precio_total
            );

            $ped = $db->insert('pedidos_detalles', $data);
            if ($ped > -1) {
            } else {
                $db->rollback();
                echo json_encode(-1);
                return;
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
        'fecha_entrega' => $item_decoded->fecha_entrega != '0000-00-00 00:00:00' ? $db->now() : $item_decoded->fecha_entrega,
        'total' => $item_decoded->total,
        'iva' => $item_decoded->iva,
        'sucursal_id' => $item_decoded->sucursal_id
    );

    $result = $db->update('pedidos', $data);


    if ($result) {
        $db->where('pedido_id', $item_decoded->pedido_id);
        $db->delete('pedidos_detalles');
        foreach ($item_decoded->pedidos_detalles as $pedido_detalle) {
            $subitem_decoded = checkPedidodetalle($pedido_detalle);

            $data = array(
                'pedido_id' => $item_decoded->pedido_id,
                'producto_id' => $subitem_decoded->producto_id,
                'cantidad' => $subitem_decoded->cantidad,
                'precio_unidad' => $subitem_decoded->precio_unidad,
                'precio_total' => $subitem_decoded->precio_total
            );

            $result = $db->insert('pedidos_detalles', $data);
            if ($result > -1) {
            } else {
                $db->rollback();
                echo json_encode(-1);
                return;
            }

        }
        $db->commit();
        echo json_encode($result);
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
 * @param $all si debe traer solo los activo o todos, por defecto, solo los activos
 */
function getPedidos($all)
{
    $db = new MysqliDb();

//    $results = $db->get('pedidos');

    $SQL = 'SELECT
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
    o.nombre nombreProducto
FROM
    pedidos p
        INNER JOIN
    usuarios u ON p.usuario_id = u.usuario_id
        INNER JOIN
    usuarios pr ON p.proveedor_id = pr.usuario_id
        LEFT JOIN
    pedidos_detalles pd ON pd.pedido_id = p.pedido_id
        INNER JOIN
    productos o ON o.producto_id = pd.producto_id ' .
        (($all == 'false') ? 'WHERE p.fecha_entrega = "0000-00-00 00:00:00"' : '')
        . '

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
    o.nombre;';

    $results = $db->rawQuery($SQL);


    $final = array();
    foreach ($results as $row) {

        if (!isset($final[$row["pedido_id"]])) {
            $final[$row["pedido_id"]] = array(
                'pedido_id' => $row["pedido_id"],
                'proveedor_id' => $row["proveedor_id"],
                'usuario_id' => $row["usuario_id"],
                'fecha_pedido' => $row["fecha_pedido"],
                'fecha_entrega' => $row["fecha_entrega"],
                'total' => $row["total"],
                'iva' => $row["iva"],
                'sucursal_id' => $row["sucursal_id"],
                'proveedor_nombre' => $row["nombreProveedor"],
                'proveedor_apellido' => $row["apellidoProveedor"],
                'usuario_nombre' => $row["nombreUsuario"],
                'usuario_apellido' => $row["apellidoUsuario"],
                'pedidos_detalles' => array()
            );
        }
        $have_pde = false;
        if ($row["pedido_detalle_id"] !== null) {

            if (sizeof($final[$row['pedido_id']]['pedidos_detalles']) > 0) {
                foreach ($final[$row['pedido_id']]['pedidos_detalles'] as $pde) {
                    if ($pde['pedido_detalle_id'] == $row["pedido_detalle_id"]) {
                        $have_pde = true;
                    }
                }
            } else {
                $final[$row['pedido_id']]['pedidos_detalles'][] = array(
                    'pedido_detalle_id' => $row['pedido_detalle_id'],
                    'producto_id' => $row['producto_id'],
                    'cantidad' => $row['cantidad'],
                    'precio_unidad' => $row['precio_unidad'],
                    'precio_total' => $row['precio_total'],
                    'nombre' => $row['nombreProducto']
                );

                $have_pde = true;
            }

            if (!$have_pde) {
                array_push($final[$row['pedido_id']]['pedidos_detalles'], array(
                    'pedido_detalle_id' => $row['pedido_detalle_id'],
                    'producto_id' => $row['producto_id'],
                    'cantidad' => $row['cantidad'],
                    'precio_unidad' => $row['precio_unidad'],
                    'precio_total' => $row['precio_total'],
                    'nombre' => $row['nombreProducto']
                ));
            }
        }


    }
    echo json_encode(array_values($final));
}


/**
 * @descr Obtiene las pedidodetalles
 */
function getPedidosDetalles($pedido_id)
{
    $db = new MysqliDb();
    $db->where('pedido_id', $pedido_id);
    $results = $db->get('pedidos_detalles');

    echo json_encode($results);
}


/**
 * @descr Obtiene los pedidos. En caso de enviar un usuario_id != -1, se traerán todos los stocks. Solo usar esta opción cuando se aplica en la parte de administración
 */
function getStocks($reducido)
{
    $db = new MysqliDb();
    //    $results = $db->get('pedidos');
    $results = $db->rawQuery('SELECT
    p.stock_id,
    p.producto_id,
    p.proveedor_id,
    p.sucursal_id,
    p.fecha_compra,
    p.cant_actual,
    p.cant_inicial,
    p.costo_uni,
    pr.nombre,
    pr.apellido,
    o.nombre nombreProducto,
    o.pto_repo,
    o.sku,
    o.producto_tipo,
    pe.precio_id,
    pe.precio_tipo_id,
    pe.precio,
    pi.producto_kit_id,
    pi.producto_id productoKitId,
    pi.producto_cantidad
FROM
    stock p
        LEFT JOIN
    usuarios pr ON p.proveedor_id = pr.usuario_id
        INNER JOIN
    productos o ON o.producto_id = p.producto_id
        INNER JOIN
    precios pe ON o.producto_id = pe.producto_id
        LEFT JOIN
    productos_kits pi ON o.producto_id = pi.parent_id
    ' . (($reducido) ? ' WHERE p.cant_actual > 0 ' : '') . '
GROUP BY p.stock_id,
    p.producto_id,
    p.proveedor_id,
    p.sucursal_id,
    p.fecha_compra,
    p.cant_actual,
    p.cant_inicial,
    p.costo_uni,
    pr.nombre,
    pr.apellido,
    o.nombre,
    o.pto_repo,
    o.sku,
    o.producto_tipo,
    pe.precio_id,
    pe.precio_tipo_id,
    pe.precio,
    pi.producto_kit_id,
    pi.producto_id,
    pi.producto_cantidad;');


    $final = array();
    foreach ($results as $row) {

        if (!isset($final[$row["stock_id"]])) {
            $final[$row["stock_id"]] = array(
                'stock_id' => $row["stock_id"],
                'producto_id' => $row["producto_id"],
                'proveedor_id' => $row["proveedor_id"],
                'sucursal_id' => $row["sucursal_id"],
                'fecha_compra' => $row["fecha_compra"],
                'cant_actual' => $row["cant_actual"],
                'cant_inicial' => $row["cant_inicial"],
                'costo_uni' => $row["costo_uni"],
                'nombre' => $row["nombre"],
                'apellido' => $row["apellido"],
                'nombreProducto' => $row["nombreProducto"],
                'pto_repo' => $row["pto_repo"],
                'sku' => $row["sku"],
                'producto_tipo' => $row["producto_tipo"],
                'precios' => array(),
                'kits' => array()
            );
        }


        $have_pre = false;
        if ($row["precio_id"] !== null) {

            if (sizeof($final[$row['stock_id']]['precios']) > 0) {
                foreach ($final[$row['stock_id']]['precios'] as $cat) {
                    if ($cat['precio_id'] == $row["precio_id"]) {
                        $have_pre = true;
                    }
                }
            } else {
                $final[$row['stock_id']]['precios'][] = array(
                    'precio_id' => $row['precio_id'],
                    'precio_tipo_id' => $row['precio_tipo_id'],
                    'precio' => $row['precio']
                );

                $have_pre = true;
            }

            if (!$have_pre) {
                array_push($final[$row['stock_id']]['precios'], array(
                    'precio_id' => $row['precio_id'],
                    'precio_tipo_id' => $row['precio_tipo_id'],
                    'precio' => $row['precio']
                ));
            }
        }


        $have_kit = false;
        if ($row["producto_kit_id"] !== null) {

            if (sizeof($final[$row['stock_id']]['kits']) > 0) {
                foreach ($final[$row['stock_id']]['kits'] as $cat) {
                    if ($cat['producto_kit_id'] == $row["producto_kit_id"]) {
                        $have_kit = true;
                    }
                }
            } else {
                $final[$row['stock_id']]['kits'][] = array(
                    'producto_kit_id' => $row['producto_kit_id'],
                    'producto_id' => $row['productoKitId'],
                    'producto_cantidad' => $row['producto_cantidad']
                );

                $have_kit = true;
            }

            if (!$have_kit) {
                array_push($final[$row['stock_id']]['kits'], array(
                    'producto_kit_id' => $row['producto_kit_id'],
                    'producto_id' => $row['productoKitId'],
                    'producto_cantidad' => $row['producto_cantidad']
                ));
            }
        }


    }
    echo json_encode(array_values($final));
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
    $pedido->fecha_entrega = (!array_key_exists("fecha_entrega", $pedido)) ? '0000 - 00 - 00 00:00:00' : $pedido->fecha_entrega;
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

/**
 * @description Mueve una determinada cantidad de un producto a otra sucursal
 * @param $origen_id
 * @param $destino_id
 * @param $producto_id
 * @param $cantidad
 */
function trasladar($origen_id, $destino_id, $producto_id, $cantidad)
{
    $db = new MysqliDb();
    $cant_a_mover = $cantidad;

    $stock_origen = $db->rawQuery('select stock_id, cant_actual, costo_uni, proveedor_id from stock where sucursal_id = ' . $origen_id . '
and producto_id = ' . $producto_id . ' order by stock_id asc');
    foreach ($stock_origen as $row) {

        if ($cant_a_mover > 0 && $row["cant_actual"] > 0) {
            if ($row["cant_actual"] < $cant_a_mover) {
                $db->where('stock_id', $row['stock_id']);
                $data = array('cant_actual' => 0);
                $db->update('stock', $data);


                $insertar = array('producto_id' => $producto_id,
                    'proveedor_id' => $row['proveedor_id'],
                    'sucursal_id' => $destino_id,
                    'cant_actual' => $cant_a_mover - $row["cant_actual"],
                    'cant_inicial' => $cant_a_mover - $row["cant_inicial"],
                    'costo_uni' => $row['costo_uni']
                );
                $db->insert('stock', $insertar);

                $cant_a_mover = $cant_a_mover - $row["cant_actual"];
            }

            if ($row["cant_actual"] > $cant_a_mover) {

                $db->where('stock_id', $row['stock_id']);
                $data = array('cant_actual' => $row["cant_actual"] - $cant_a_mover);
                $db->update('stock', $data);

                $insertar = array('producto_id' => $producto_id,
                    'proveedor_id' => $row['proveedor_id'],
                    'sucursal_id' => $destino_id,
                    'cant_actual' => $cant_a_mover,
                    'cant_inicial' => $cant_a_mover,
                    'costo_uni' => $row['costo_uni']
                );
                $db->insert('stock', $insertar);

                $cant_a_mover = 0;

            }

            if ($row["cant_actual"] == $cant_a_mover) {

                $db->where('stock_id', $row['stock_id']);
                $data = array('cant_actual' => 0);
                $db->update('stock', $data);


                $insertar = array('producto_id' => $producto_id,
                    'proveedor_id' => $row['proveedor_id'],
                    'sucursal_id' => $destino_id,
                    'cant_actual' => $cant_a_mover,
                    'cant_inicial' => $cant_a_mover,
                    'costo_uni' => $row['costo_uni']
                );
                $db->insert('stock', $insertar);

                $cant_a_mover = 0;
            }
        }
    }

    echo json_encode($db->getLastError());
}
