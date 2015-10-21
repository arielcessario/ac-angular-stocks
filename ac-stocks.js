(function () {
    'use strict';

    var scripts = document.getElementsByTagName("script");
    var currentScriptPath = scripts[scripts.length - 1].src;

    angular.module('acStocks', [])
        .factory('PedidoService', PedidoService)
        .service('PedidoVars', PedidoVars)
        .factory('StockService', StockService)
        .service('StockVars', StockVars)
    ;


    PedidoService.$inject = ['$http', 'PedidoVars', '$cacheFactory', 'AcUtils'];
    /**
     * @description Administrador de pedidos
     * @param $http
     * @param PedidoVars
     * @param $cacheFactory
     * @param AcUtils
     * @returns {{}}
     * @constructor
     */
    function PedidoService($http, PedidoVars, $cacheFactory, AcUtils) {
        //Variables
        var service = {};

        var url = currentScriptPath.replace('ac-stocks.js', '/includes/ac-stocks.php');

        //Function declarations
        service.get = get;
        service.getPedidosDetalles = getPedidosDetalles;
        service.getByParams = getByParams;

        service.create = create;
        service.createPedidoDetalle = createPedidoDetalle;

        service.update = update;
        service.updatePedidoDetalle = updatePedidoDetalle;
        service.confirmarPedido = confirmarPedido; //Hacer update de fecha_entrega a now(); Generar Stock;
        service.faltantes = faltantes;

        service.remove = remove;
        service.removePedidoDetalle = removePedidoDetalle;


        service.goToPagina = goToPagina;
        service.next = next;
        service.prev = prev;

        return service;

        //Functions
        /**
         * @description Devuelve los detalles de un pedido determinado
         * @param pedido_id
         * @param callback
         * @returns {*}
         */
        function getPedidosDetalles(pedido_id, callback) {
            return $http.get(url + '?function=getPedidoDetalles&pedido_id=' + pedido_id, {cache: false})
                .success(function (data) {
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    PedidoVars.clearCache = false;
                })
        }

        /**
         * @description Modifica un detalle en particular
         * @param pedido_detalle
         * @param callback
         * @returns {*}
         */
        function updatePedidoDetalle(pedido_detalle, callback) {
            return $http.post(url,
                {
                    'function': 'updatePedidoDetalle',
                    'pedido_detalle': JSON.stringify(pedido_detalle)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * @description crea un detalle
         * @param pedido_detalle
         * @param callback
         * @returns {*}
         */
        function createPedidoDetalle(pedido_detalle, callback) {
            return $http.post(url,
                {
                    'function': 'createPedidoDetalle',
                    'pedido_detalle': JSON.stringify(pedido_detalle)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * @description Elimina un detalle en particular
         * @param pedido_detalle_id
         * @param callback
         * @returns {*}
         */
        function removePedidoDetalle(pedido_detalle_id, callback) {
            return $http.post(url,
                {
                    'function': 'removePedidoDetalle',
                    'pedido_detalle_id': JSON.stringify(pedido_detalle_id)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }


        /**
         * Proceso que se ocupa de generar faltantes, ya sea en un pedido nuevo o en un pedido existente
         * @param pedido_origen
         * @param pedido_destino
         * @param faltantes
         * @param usuario_id
         * @param callback
         */
        function faltantes(pedido_origen, pedido_destino, faltantes, usuario_id, callback) {
            var total_pedido_origen = 0.0;
            var total_pedido_faltantes = 0.0;


            for (var i = 0; i < faltantes.length; i++) {

                total_pedido_faltantes = parseFloat(total_pedido_faltantes) + parseFloat(faltantes[i].precio_total);

            }

            total_pedido_origen = parseFloat(pedido_origen.total) - total_pedido_faltantes;
            //console.log(total_pedido_origen);
            //console.log(total_pedido_faltantes);


            var nuevo_pedido = {
                detalles: [], iva: '', pedido_id: -1,
                proveedor_nombre: '', sucursal_id: '', total: 0.0, usuario_id: 1, proveedor_id: 0
            };

            nuevo_pedido.pedidos_detalles = faltantes;
            nuevo_pedido.iva = pedido_origen.iva;
            nuevo_pedido.pedido_id = pedido_origen.pedido_id;
            nuevo_pedido.proveedor_nombre = pedido_origen.proveedor_nombre;
            nuevo_pedido.sucursal_id = pedido_origen.sucursal_id;
            nuevo_pedido.total = total_pedido_faltantes;
            nuevo_pedido.usuario_id = usuario_id;
            nuevo_pedido.proveedor_id = pedido_origen.proveedor_id;

            pedido_origen.total = total_pedido_origen;


            var detallesSinFaltantes = pedido_origen.pedidos_detalles.filter(
                function (elem, index, array) {
                    var encontrado = false;
                    for (var x = 0; x < faltantes.length; x++) {
                        if (elem.pedido_detalle_id == faltantes[x].pedido_detalle_id) {
                            encontrado = true;
                        }
                    }

                    if (!encontrado) {
                        return elem;
                    }
                }
            );

            pedido_origen.pedidos_detalles = detallesSinFaltantes;

            //console.log(vm.pedido);
            //console.log(vm.nuevoPedido);


            if (pedido_destino.pedido_id === -1) {

                create(nuevo_pedido, function (data) {
                    //console.log(data);
                    update(pedido_origen, function (data) {
                        //console.log(data);
                        callback(data);
                    })
                })
            } else {
                //vm.nuevoPedido = {};
                //vm.nuevoPedido = vm.pedido;
                //vm.nuevoPedido.detalles = vm.faltantes;


                getByParams('pedido_id', pedido_destino.pedido_id, true, function (data) {

                    for (var i = 0; i < data.detalles.length; i++) {
                        data.pedidos_detalles.push(data.pedidos_detalles[i]);
                    }

                    //data.pedidos_detalles = faltantes;
                    data.total = parseFloat(data.total) + total_pedido_faltantes;
                    //console.log(vm.pedido);
                    //console.log(data);

                    update(data, function (data) {
                        update(pedido_origen, function (data) {
                            callback(data);
                            //console.log(data);
                        })
                    })
                });
            }
        }


        /**
         * @description Obtiene todos los pedidos
         * @param callback
         * @returns {*}
         */
        function get(callback) {
            var urlGet = url + '?function=getPedidos&all=' + PedidoVars.all;
            var $httpDefaultCache = $cacheFactory.get('$http');
            var cachedData = [];


            // Verifica si existe el cache de pedidos
            if ($httpDefaultCache.get(urlGet) != undefined) {
                if (PedidoVars.clearCache) {
                    $httpDefaultCache.remove(urlGet);
                }
                else {
                    cachedData = $httpDefaultCache.get(urlGet);
                    callback(cachedData);
                    return;
                }
            }


            return $http.get(urlGet, {cache: true})
                .success(function (data) {
                    $httpDefaultCache.put(urlGet, data);
                    PedidoVars.clearCache = false;
                    PedidoVars.paginas = (data.length % PedidoVars.paginacion == 0) ? parseInt(data.length / PedidoVars.paginacion) : parseInt(data.length / PedidoVars.paginacion) + 1;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    PedidoVars.clearCache = false;
                })
        }


        /**
         * @description Retorna la lista filtrada de pedidos
         * @param param -> String, separado por comas (,) que contiene la lista de parï¿½metros de bï¿½squeda, por ej: nombre, sku
         * @param value
         * @param callback
         */
        function getByParams(params, values, exact_match, callback) {
            get(function (data) {
                AcUtils.getByParams(params, values, exact_match, data, callback);
            })
        }


        /** @name: remove
         * @param pedido_id
         * @param callback
         * @description: Elimina el pedido seleccionado.
         */
        function remove(pedido_id, callback) {
            return $http.post(url,
                {function: 'removePedido', 'pedido_id': pedido_id})
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        PedidoVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description: Crea un pedido.
         * @param pedido
         * @param callback
         * @returns {*}
         */
        function create(pedido, callback) {

            return $http.post(url,
                {
                    'function': 'createPedido',
                    'pedido': JSON.stringify(pedido)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                });
        }


        /** @name: update
         * @param pedido
         * @param callback
         * @description: Realiza update al pedido.
         */
        function update(pedido, callback) {
            return $http.post(url,
                {
                    'function': 'updatePedido',
                    'pedido': JSON.stringify(pedido)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /** @name: Confirma un pedido
         * @param pedido
         * @param callback
         * @description: Realiza update al pedido.
         */
        function confirmarPedido(pedido, callback) {
            pedido.fecha_entrega = 'now';
            return $http.post(url,
                {
                    'function': 'updatePedido',
                    'pedido': JSON.stringify(pedido)
                })
                .success(function (data) {
                    PedidoVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * Para el uso de la pï¿½ginaciï¿½n, definir en el controlador las siguientes variables:
         *
         vm.start = 0;
         vm.pagina = PedidoVars.pagina;
         PedidoVars.paginacion = 5; Cantidad de registros por pï¿½gina
         vm.end = PedidoVars.paginacion;


         En el HTML, en el ng-repeat agregar el siguiente filtro: limitTo:appCtrl.end:appCtrl.start;

         Agregar un botï¿½n de next:
         <button ng-click="appCtrl.next()">next</button>

         Agregar un botï¿½n de prev:
         <button ng-click="appCtrl.prev()">prev</button>

         Agregar un input para la pï¿½gina:
         <input type="text" ng-keyup="appCtrl.goToPagina()" ng-model="appCtrl.pagina">

         */


        /**
         * @description: Ir a pï¿½gina
         * @param pagina
         * @returns {*}
         * uso: agregar un mï¿½todo
         vm.goToPagina = function () {
                vm.start= PedidoService.goToPagina(vm.pagina).start;
            };
         */
        function goToPagina(pagina) {

            if (isNaN(pagina) || pagina < 1) {
                PedidoVars.pagina = 1;
                return PedidoVars;
            }

            if (pagina > PedidoVars.paginas) {
                PedidoVars.pagina = PedidoVars.paginas;
                return PedidoVars;
            }

            PedidoVars.pagina = pagina - 1;
            PedidoVars.start = PedidoVars.pagina * PedidoVars.paginacion;
            return PedidoVars;

        }

        /**
         * @name next
         * @description Ir a prï¿½xima pï¿½gina
         * @returns {*}
         * uso agregar un metodo
         vm.next = function () {
                vm.start = PedidoService.next().start;
                vm.pagina = PedidoVars.pagina;
            };
         */
        function next() {

            if (PedidoVars.pagina + 1 > PedidoVars.paginas) {
                return PedidoVars;
            }
            PedidoVars.start = (PedidoVars.pagina * PedidoVars.paginacion);
            PedidoVars.pagina = PedidoVars.pagina + 1;
            //PedidoVars.end = PedidoVars.start + PedidoVars.paginacion;
            return PedidoVars;
        }

        /**
         * @name previous
         * @description Ir a pï¿½gina anterior
         * @returns {*}
         * uso, agregar un mï¿½todo
         vm.prev = function () {
                vm.start= PedidoService.prev().start;
                vm.pagina = PedidoVars.pagina;
            };
         */
        function prev() {


            if (PedidoVars.pagina - 2 < 0) {
                return PedidoVars;
            }

            //PedidoVars.end = PedidoVars.start;
            PedidoVars.start = (PedidoVars.pagina - 2 ) * PedidoVars.paginacion;
            PedidoVars.pagina = PedidoVars.pagina - 1;
            return PedidoVars;
        }


    }

    PedidoVars.$inject = [];
    /**
     * @description Almacena variables temporales de productos
     * @constructor
     */
    function PedidoVars() {
        // Cantidad de pï¿½ginas total del recordset
        this.paginas = 1;
        // Pï¿½gina seleccionada
        this.pagina = 1;
        // Cantidad de registros por pï¿½gina
        this.paginacion = 10;
        // Registro inicial, no es pï¿½gina, es el registro
        this.start = 0;


        // Indica si debe traer todos los pedidos o solo los activos, por defecto, solo los activos
        this.all = false;
        // Indica si se debe limpiar el cachï¿½ la prï¿½xima vez que se solicite un get
        this.clearCache = true;

    }


    StockService.$inject = ['$http', 'StockVars', '$cacheFactory', 'AcUtils'];
    function StockService($http, StockVars, $cacheFactory, AcUtils) {
        //Variables
        var service = {};

        var url = currentScriptPath.replace('ac-stocks.js', '/includes/ac-stocks.php');

        //Function declarations
        service.get = get;
        service.getByParams = getByParams;

        service.create = create;

        service.update = update;
        service.aReponer = aReponer;
        service.trasladar = trasladar; // Por performance es mejor hacer en el php
        service.getDisponibles = getDisponibles;

        service.remove = remove;


        service.goToPagina = goToPagina;
        service.next = next;
        service.prev = prev;

        return service;

        //Functions
        function getDisponibles(sucursal_id, nombreProducto, callback) {

            get(function (data) {
                var response = [];
                var productos = [];
                if (data.length > 0) {
                    response = data.filter(function (element, index, array) {

                        if (element.sucursal_id == sucursal_id &&
                            (element.nombreProducto.toUpperCase().indexOf(nombreProducto.toUpperCase()) > -1 ||
                            (element.sku != null && element.sku.indexOf(nombreProducto) > -1)) &&
                            element.cant_actual > 0) {

                            var encontrado = false;
                            for (var i = 0; i < productos.length; i++) {

                                if (productos[i].producto_id == element.producto_id) {
                                    encontrado = true;


                                    // Esto es solo para que funcione con los movimientos, hay que sacarlo cuando volvamos a hacer movimientos

                                    var st = {
                                        cant_actual: element.cant_actual,
                                        costo_uni: element.costo_uni,
                                        stock_id: element.stock_id,
                                        sucursal_id: element.sucursal_id

                                    };
                                    productos[i].stock.push(st);
                                    productos[i].cant_actual = element.cant_actual + productos[i].cant_actual;

                                }
                            }

                            if (!encontrado) {
                                var prod = angular.copy(element);

                                // Esto es solo para que funcione con los movimientos, hay que sacarlo cuando volvamos a hacer movimientos
                                prod.stock = [];
                                var st = {
                                    cant_actual: prod.cant_actual,
                                    costo_uni: prod.costo_uni,
                                    stock_id: prod.stock_id,
                                    sucursal_id: prod.sucursal_id

                                };
                                prod.stock.push(st);
                                //
                                productos.push(prod);
                            }

                        }
                    });
                }

                callback(productos);
            })
        }

        /**
         * @description Devuelve una lista de productos a reponer
         * @param callback
         */
        function aReponer(callback) {
            StockVars.clearCache = true;
            get(function (data) {
                var response = data.filter(function (element, index, array) {
                    return element.cant_actual < element.pto_repo;
                });

                callback(response);
            })
        }

        /**
         * @description traslada una cantidad determinada de productos de una sucursal a otra
         * @param origen_id
         * @param destino_id
         * @param producto_id
         * @param cantidad
         * @param callback
         * @returns {*}
         */
        function trasladar(origen_id, destino_id, producto_id, cantidad, callback) {
            if (origen_id == destino_id) {
                callback(-1);
                return;
            }

            return $http.post(url,
                {
                    function: 'trasladar',
                    'origen_id': origen_id,
                    'destino_id': destino_id,
                    'producto_id': producto_id,
                    'cantidad': cantidad
                })
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        StockVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description Obtiene todos los stock
         * @param callback
         * @returns {*}
         */
        function get(callback) {
            var urlGet = url + '?function=getStocks&reducido=' + StockVars.reducido;
            var $httpDefaultCache = $cacheFactory.get('$http');
            var cachedData = [];


            // Verifica si existe el cache de stock
            if ($httpDefaultCache.get(urlGet) != undefined) {
                if (StockVars.clearCache) {
                    $httpDefaultCache.remove(urlGet);
                }
                else {
                    cachedData = $httpDefaultCache.get(urlGet);
                    callback(cachedData);
                    return;
                }
            }


            return $http.get(urlGet, {cache: true})
                .success(function (data) {
                    $httpDefaultCache.put(urlGet, data);
                    StockVars.clearCache = false;
                    StockVars.paginas = (data.length % StockVars.paginacion == 0) ? parseInt(data.length / StockVars.paginacion) : parseInt(data.length / StockVars.paginacion) + 1;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                    StockVars.clearCache = false;
                })
        }


        /**
         * @description Retorna la lista filtrada de stocks
         * @param param -> String, separado por comas (,) que contiene la lista de parï¿½metros de bï¿½squeda, por ej: nombre, sku
         * @param value
         * @param callback
         */
        function getByParams(params, values, exact_match, callback) {
            get(function (data) {

                AcUtils.getByParams(params, values, exact_match, data, callback);
            })
        }

        /** @name: remove
         * @param stock_id
         * @param callback
         * @description: Elimina el stock seleccionado.
         */
        function remove(stock_id, callback) {
            return $http.post(url,
                {function: 'removeStock', 'stock_id': stock_id})
                .success(function (data) {
                    //console.log(data);
                    if (data !== 'false') {
                        StockVars.clearCache = true;
                        callback(data);
                    }
                })
                .error(function (data) {
                    callback(data);
                })
        }

        /**
         * @description: Crea un stock.
         * @param stock
         * @param callback
         * @returns {*}
         */
        function create(stock, callback) {

            return $http.post(url,
                {
                    'function': 'createCategoria',
                    'stock': JSON.stringify(stock)
                })
                .success(function (data) {
                    StockVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    StockVars.clearCache = true;
                    callback(data);
                });
        }


        /** @name: update
         * @param stock
         * @param callback
         * @description: Realiza update al stock.
         */
        function update(stock, callback) {
            return $http.post(url,
                {
                    'function': 'updateCategoria',
                    'stock': JSON.stringify(stock)
                })
                .success(function (data) {
                    StockVars.clearCache = true;
                    callback(data);
                })
                .error(function (data) {
                    callback(data);
                });
        }

        /**
         * Para el uso de la pï¿½ginaciï¿½n, definir en el controlador las siguientes variables:
         *
         vm.start = 0;
         vm.pagina = StockVars.pagina;
         StockVars.paginacion = 5; Cantidad de registros por pï¿½gina
         vm.end = StockVars.paginacion;


         En el HTML, en el ng-repeat agregar el siguiente filtro: limitTo:appCtrl.end:appCtrl.start;

         Agregar un botï¿½n de next:
         <button ng-click="appCtrl.next()">next</button>

         Agregar un botï¿½n de prev:
         <button ng-click="appCtrl.prev()">prev</button>

         Agregar un input para la pï¿½gina:
         <input type="text" ng-keyup="appCtrl.goToPagina()" ng-model="appCtrl.pagina">

         */


        /**
         * @description: Ir a pï¿½gina
         * @param pagina
         * @returns {*}
         * uso: agregar un mï¿½todo
         vm.goToPagina = function () {
                vm.start= StockService.goToPagina(vm.pagina).start;
            };
         */
        function goToPagina(pagina) {

            if (isNaN(pagina) || pagina < 1) {
                StockVars.pagina = 1;
                return StockVars;
            }

            if (pagina > StockVars.paginas) {
                StockVars.pagina = StockVars.paginas;
                return StockVars;
            }

            StockVars.pagina = pagina - 1;
            StockVars.start = StockVars.pagina * StockVars.paginacion;
            return StockVars;

        }

        /**
         * @name next
         * @description Ir a prï¿½xima pï¿½gina
         * @returns {*}
         * uso agregar un metodo
         vm.next = function () {
                vm.start = StockService.next().start;
                vm.pagina = StockVars.pagina;
            };
         */
        function next() {

            if (StockVars.pagina + 1 > StockVars.paginas) {
                return StockVars;
            }
            StockVars.start = (StockVars.pagina * StockVars.paginacion);
            StockVars.pagina = StockVars.pagina + 1;
            //StockVars.end = StockVars.start + StockVars.paginacion;
            return StockVars;
        }

        /**
         * @name previous
         * @description Ir a pï¿½gina anterior
         * @returns {*}
         * uso, agregar un mï¿½todo
         vm.prev = function () {
                vm.start= StockService.prev().start;
                vm.pagina = StockVars.pagina;
            };
         */
        function prev() {


            if (StockVars.pagina - 2 < 0) {
                return StockVars;
            }

            //StockVars.end = StockVars.start;
            StockVars.start = (StockVars.pagina - 2 ) * StockVars.paginacion;
            StockVars.pagina = StockVars.pagina - 1;
            return StockVars;
        }


    }

    StockVars.$inject = [];
    /**
     * @description Almacena variables temporales de stocks
     * @constructor
     */
    function StockVars() {
        // Cantidad de pï¿½ginas total del recordset
        this.paginas = 1;
        // Pï¿½gina seleccionada
        this.pagina = 1;
        // Cantidad de registros por pï¿½gina
        this.paginacion = 10;
        // Registro inicial, no es pï¿½gina, es el registro
        this.start = 0;

        // Variable que regristra si se traen todos los stocks o solos los mayores a 0
        this.reducido = true;

        // Indica si se debe limpiar el cachï¿½ la prï¿½xima vez que se solicite un get
        this.clearCache = true;

    }

})();